from flask import Blueprint, request, jsonify
from datetime import datetime
from .models import db, DeviceConfig, Receipt
from .fiscal_core import calculate_hash, sign_receipt

bp = Blueprint('api', __name__)

@bp.route('/api/submit-receipt', methods=['POST'])
def submit_receipt():
    data = request.json
    device_id = data.get('deviceID')
    amount = float(data.get('totalAmount'))
    invoice_no = data.get('invoiceNo')
    
    # 1. Get Device State
    config = DeviceConfig.query.filter_by(device_id=str(device_id)).first()
    if not config or not config.is_day_open:
        return jsonify({"error": "Fiscal Day is NOT Open"}), 400
        
    # 2. Calculate New Counters
    # Get last receipt global number
    last_receipt = Receipt.query.order_by(Receipt.global_no.desc()).first()
    new_global = (last_receipt.global_no + 1) if last_receipt else 1
    
    # Get Previous Hash (The Chain)
    prev_hash = config.last_receipt_hash
    
    # 3. Generate Security Data
    date_str = datetime.now().strftime("%Y%m%d%H%M%S")
    
    # HASH IT
    current_hash = calculate_hash(
        device_id, 
        config.current_fiscal_day, 
        new_global, 
        amount, 
        prev_hash, 
        date_str
    )
    
    # SIGN IT
    signature = sign_receipt(device_id, current_hash)
    
    # 4. Save to Database
    new_receipt = Receipt(
        fiscal_day_no=config.current_fiscal_day,
        global_no=new_global,
        invoice_no=invoice_no,
        total_amount=amount,
        tax_amount=amount * 0.15, # Simplified Tax logic
        previous_hash=prev_hash,
        receipt_hash=current_hash,
        signature=signature
    )
    
    # Update Device Config with new "Last Hash"
    config.last_receipt_hash = current_hash
    
    db.session.add(new_receipt)
    db.session.commit()
    
    # 5. Return Data to React (for QR Code and receipt header/footer)
    return jsonify({
        "status": "success",
        "receiptID": new_global,
        "hash": current_hash,
        "signature": signature,
        "qr_data": f"{device_id}{date_str}{new_global}{current_hash[:10]}",
        "fiscal_identity": {
            "tax_payer_name": config.tax_payer_name,
            "trade_name": config.trade_name,
            "bp_number": config.bp_number,
            "vat_number": config.vat_number,
            "address": config.address,
            "device_id": config.device_id,
            "fiscal_day_no": config.current_fiscal_day,
        },
    })