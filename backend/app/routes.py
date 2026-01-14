# --- ADD 'requests' TO IMPORTS ---
import requests 
from flask import Blueprint, request, jsonify
from datetime import datetime
from .models import db, DeviceConfig, Receipt
from .fiscal_core import calculate_hash, sign_receipt, generate_device_keys, generate_csr

api_bp = Blueprint('api', __name__)

# --- 0. FETCH DEVICE ID FROM ZIMRA (New Step 0) ---
@api_bp.route('/setup/fetch-zimra-id', methods=['POST'])
def fetch_zimra_id():
    data = request.json
    serial_no = data.get('serialNumber')
    
    try:
        # 1. Ask Mock Server for an ID
        # Note: We use the Public/v1 route we just created
        zimra_url = "http://localhost:4000/Public/v1/LookupDeviceID"
        payload = {"serialNumber": serial_no}
        
        print(f"Requesting ID from ZIMRA for: {serial_no}")
        response = requests.post(zimra_url, json=payload)
        
        if response.status_code != 200:
            return jsonify({"status": "error", "message": "ZIMRA Rejected Serial", "details": response.text}), 400
            
        zimra_data = response.json()
        device_id = zimra_data.get('deviceID')
        
        return jsonify({
            "status": "success",
            "deviceID": device_id,
            "message": "ZIMRA has issued a Device ID"
        })
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# --- 1. STATUS CHECK ---
@api_bp.route('/device/status', methods=['GET'])
def device_status():
    try:
        config = DeviceConfig.query.first()
        # Only return 'configured' if we actually have the Certificate
        if config and config.is_registered: 
            return jsonify({
                "status": "configured",
                "deviceID": config.device_id,
                "serialNumber": config.serial_number,
                "is_day_open": config.is_day_open,
                "fiscal_day": config.current_fiscal_day
            })
        else:
            return jsonify({"status": "not_configured"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# --- 2. GENERATE KEYS (Step 1) ---
@api_bp.route('/setup/generate-keys', methods=['POST'])
def generate_keys_route():
    data = request.json
    device_id = data.get('deviceID')
    serial_no = data.get('serialNumber')
    
    try:
        key_path, private_key = generate_device_keys(device_id)
        csr_pem = generate_csr(device_id, serial_no, private_key)
        
        # Save temp config
        if not DeviceConfig.query.filter_by(device_id=str(device_id)).first():
            new_config = DeviceConfig(device_id=str(device_id), serial_number=serial_no)
            db.session.add(new_config)
            db.session.commit()
            
        return jsonify({"status": "success", "csr": csr_pem})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# --- 3. COMPLETE REGISTRATION (The New Bridge) ---
@api_bp.route('/setup/register', methods=['POST'])
def register_with_zimra():
    data = request.json
    device_id = data.get('deviceID')
    csr_pem = data.get('csr') # Frontend sends us the CSR back to confirm
    
    try:
        # A. Prepare the Payload for the Mock Server
        # This matches what your Mock Server expects
        payload = {
            "deviceid": int(device_id),
            "csr": csr_pem
        }
        
        # B. Send to Mock Server (ZIMRA)
        # Note: We use the URL from your config (http://localhost:4000/Device/v1)
        zimra_url = "http://localhost:4000/Device/v1/IssueCertificate"
        print(f"Connecting to ZIMRA: {zimra_url}")
        
        response = requests.post(zimra_url, json=payload)
        
        if response.status_code != 200:
            return jsonify({"status": "error", "message": "ZIMRA Rejected Request", "details": response.text}), 400
            
        # C. Process Success
        zimra_data = response.json()
        certificate = zimra_data.get('certificate')
        
        # D. Save to Our Database
        config = DeviceConfig.query.filter_by(device_id=str(device_id)).first()
        if config:
            config.certificate = certificate
            config.is_registered = True
            db.session.commit()
            
        return jsonify({"status": "success", "certificate": certificate})
        
    except requests.exceptions.ConnectionError:
        return jsonify({"status": "error", "message": "Could not connect to Mock Server (Is it running on Port 4000?)"}), 503
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# --- (Keep your existing Open Day, Close Day, Submit Receipt routes below) ---
@api_bp.route('/day/open', methods=['POST'])
def open_day():
    # ... (Keep existing code) ...
    data = request.json
    device_id = str(data.get('deviceID'))
    config = DeviceConfig.query.filter_by(device_id=device_id).first()
    if not config:
        return jsonify({"status": "error", "message": "Device not found"}), 404
    if config.is_day_open:
        return jsonify({"status": "error", "message": "Day already open"}), 400
    config.is_day_open = True
    config.current_fiscal_day += 1
    db.session.commit()
    return jsonify({"status": "success", "fiscalDayNo": config.current_fiscal_day})

@api_bp.route('/day/close', methods=['POST'])
def close_day():
    # ... (Keep existing code) ...
    data = request.json
    device_id = str(data.get('deviceID'))
    config = DeviceConfig.query.filter_by(device_id=device_id).first()
    if config:
        config.is_day_open = False
        db.session.commit()
        return jsonify({"status": "success", "message": "Day Closed"})
    return jsonify({"status": "error"}), 400

@api_bp.route('/submit-receipt', methods=['POST'])
def submit_receipt():
    data = request.json
    device_id = str(data.get('deviceID'))
    amount = float(data.get('totalAmount'))
    # Default to "Cash" for this demo
    currency = data.get('currency', 'ZWG') 
    
    # 1. Validation
    config = DeviceConfig.query.filter_by(device_id=device_id).first()
    if not config or not config.is_day_open:
        return jsonify({"status": "error", "message": "Fiscal Day is NOT Open"}), 400
        
    try:
        # 2. Calculate Counters (Global No, etc.)
        last_receipt = Receipt.query.order_by(Receipt.global_no.desc()).first()
        new_global = (last_receipt.global_no + 1) if last_receipt else 1
        invoice_no = f"INV-{new_global:06d}"
        prev_hash = config.last_receipt_hash
        date_str = datetime.now().strftime("%Y%m%d%H%M%S") # Format: YYYYMMDDHHMMSS
        
        # 3. Local Security (Calculate Hash & Sign)
        # We sign: DeviceID + FiscalDay + GlobalNo + Amount + PrevHash + Date
        current_hash = calculate_hash(device_id, config.current_fiscal_day, new_global, amount, prev_hash, date_str)
        signature = sign_receipt(device_id, current_hash)
        
        # 4. Prepare ZIMRA Payload (Matches Mock Server 'SubmitReceiptRequest')
        # This is the complex JSON structure ZIMRA expects
        zimra_payload = {
            "receiptType": "FiscalInvoice",
            "receiptCurrency": currency,
            "receiptCounter": new_global, # Simplified for demo
            "receiptGlobalNo": new_global,
            "invoiceNo": invoice_no,
            "receiptDate": datetime.now().isoformat(),
            "receiptLinesTaxInclusive": True,
            "receiptLines": [
                {
                    "receiptLineType": "Sale",
                    "receiptLineNo": 1,
                    "receiptLineName": "General Goods",
                    "receiptLineQuantity": 1,
                    "receiptLineTotal": amount,
                    "taxPercent": 15,
                    "taxID": 1
                }
            ],
            "receiptTaxes": [],
            "receiptPayments": [
                {
                    "moneyTypeCode": "Cash",
                    "paymentAmount": amount
                }
            ],
            "receiptTotal": amount,
            "receiptDeviceSignature": {
                "hash": current_hash,
                "signature": signature
            }
        }
        
        # 5. Send to Mock Server
        zimra_url = f"http://localhost:4000/Device/v1/{device_id}/SubmitReciept"
        headers = {
            "DeviceModelName": "LithiPos",
            "DeviceModelVersion": "1.0"
        }
        
        print(f"Reporting Receipt to ZIMRA: {zimra_url}")
        # Note: 'SubmitReciept' is the spelling in the Mock Server file provided
        zimra_response = requests.post(zimra_url, json=zimra_payload, headers=headers)
        
        server_signature = "OFFLINE"
        if zimra_response.status_code == 200:
            res_json = zimra_response.json()
            server_signature = res_json.get('receiptServerSignature', {}).get('signature', 'VERIFIED')
        else:
            print(f"ZIMRA Warning: Receipt stored locally but reporting failed: {zimra_response.text}")

        # 6. Save to Local DB
        new_receipt = Receipt(
            fiscal_day_no=config.current_fiscal_day,
            global_no=new_global,
            invoice_no=invoice_no,
            total_amount=amount,
            tax_amount=amount * 0.15,
            previous_hash=prev_hash,
            receipt_hash=current_hash,
            signature=signature
        )
        
        config.last_receipt_hash = current_hash
        db.session.add(new_receipt)
        db.session.commit()
        
        # 7. Return Data for QR Code
        # QR Format: DeviceID + Date + GlobalNo + InternalHash + ServerSig(Optional)
        qr_raw_data = f"{device_id}{date_str}{new_global}{current_hash}"
        
        return jsonify({
            "status": "success",
            "invoiceNo": invoice_no,
            "globalNo": new_global,
            "amount": amount,
            "date": date_str,
            "verification": {
                "device_hash": current_hash,
                "server_status": "Reported" if zimra_response.status_code == 200 else "Queued",
                "signature": signature
            },
            "qr_data": qr_raw_data
        })
        
    except Exception as e:
        print(e)
        return jsonify({"status": "error", "message": str(e)}), 500