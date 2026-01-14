import os
import hashlib
import base64
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography import x509
from cryptography.x509.oid import NameOID

# Ensure keys directory exists
KEYS_DIR = os.path.join(os.getcwd(), 'keys')
if not os.path.exists(KEYS_DIR):
    os.makedirs(KEYS_DIR)

def generate_device_keys(device_id):
    """Generates ECC secp256r1 keys required by ZIMRA"""
    private_key = ec.generate_private_key(ec.SECP256R1())
    
    # Save Key
    key_path = os.path.join(KEYS_DIR, f'device_{device_id}_private.pem')
    with open(key_path, "wb") as f:
        f.write(private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption()
        ))
    return key_path, private_key

def get_private_key(device_id):
    """Loads the private key from disk"""
    key_path = os.path.join(KEYS_DIR, f'device_{device_id}_private.pem')
    if not os.path.exists(key_path):
        raise Exception(f"Private Key not found for Device {device_id}. Please register first.")
        
    with open(key_path, "rb") as f:
        return serialization.load_pem_private_key(f.read(), password=None)

def generate_csr(device_id, serial_no, private_key):
    """Generates the CSR for registration"""
    # ZIMRA Requirement: CN must be ZIMRA-<Serial>-<DeviceID>
    common_name = f"ZIMRA-{serial_no}-{str(device_id).zfill(10)}"
    
    csr = x509.CertificateSigningRequestBuilder().subject_name(x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, u"ZW"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, u"Zimbabwe Revenue Authority"),
        x509.NameAttribute(NameOID.COMMON_NAME, common_name),
    ])).sign(private_key, hashes.SHA256())
    
    return csr.public_bytes(serialization.Encoding.PEM).decode('utf-8')

def calculate_hash(device_id, fiscal_day, global_no, amount, prev_hash, date_str):
    """
    Creates the SHA-256 Hash.
    Format: DeviceID + FiscalDay + GlobalNo + Date + Amount + PrevHash
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