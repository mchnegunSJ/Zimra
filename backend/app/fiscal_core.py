import os
import hashlib
import base64
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import ec

KEYS_DIR = os.path.join(os.getcwd(), 'keys')

def get_private_key(device_id):
    """Loads the private key from disk"""
    key_path = os.path.join(KEYS_DIR, f'device_{device_id}_private.pem')
    with open(key_path, "rb") as f:
        return serialization.load_pem_private_key(f.read(), password=None)

def calculate_hash(device_id, fiscal_day, global_no, amount, prev_hash, date_str):
    """
    Creates the SHA-256 Hash.
    Format: DeviceID + FiscalDay + GlobalNo + Date + Amount + PrevHash
    (Check API Spec Section 13.1 for exact order)
    """
    # ZIMRA often requires amounts in cents (integers)
    amount_cents = int(amount * 100) 
    
    # The Data String
    data_string = f"{device_id}{fiscal_day}{global_no}{date_str}{amount_cents}{prev_hash}"
    
    # Calculate SHA-256
    digest = hashlib.sha256(data_string.encode('utf-8')).digest()
    
    # Return Base64 encoded hash
    return base64.b64encode(digest).decode('utf-8')

def sign_receipt(device_id, receipt_hash):
    """Signs the receipt hash with the Private Key"""
    private_key = get_private_key(device_id)
    
    signature = private_key.sign(
        receipt_hash.encode('utf-8'),
        ec.ECDSA(hashes.SHA256())
    )
    
    return base64.b64encode(signature).decode('utf-8')