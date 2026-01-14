from . import db
from datetime import datetime

class DeviceConfig(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    # The ID given by ZIMRA (e.g., 72000003)
    device_id = db.Column(db.String(50), unique=True)
    # The physical serial (e.g., LITHITRUST-POS-001)
    serial_number = db.Column(db.String(50))
    
    # --- NEW: Digital Certificate Storage ---
    certificate = db.Column(db.Text, nullable=True)
    is_registered = db.Column(db.Boolean, default=False)
    
    # Fiscal Memory
    current_fiscal_day = db.Column(db.Integer, default=0)
    is_day_open = db.Column(db.Boolean, default=False)
    last_receipt_hash = db.Column(db.String(500), default="0")
    
    # Store Details
    tax_payer_name = db.Column(db.String(100), default="Big Old Cravings & Bakeries Pvt Ltd")
    trade_name = db.Column(db.String(100), default="Big Old Cravings")
    bp_number = db.Column(db.String(20), default="200123456")
    vat_number = db.Column(db.String(20), default="100123456")
    address = db.Column(db.String(200), default="123 Main Street, Bulawayo")

class Receipt(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    fiscal_day_no = db.Column(db.Integer, nullable=False)
    global_no = db.Column(db.Integer, unique=True, nullable=False)
    invoice_no = db.Column(db.String(50), nullable=False)
    total_amount = db.Column(db.Float, nullable=False)
    tax_amount = db.Column(db.Float, nullable=False)
    previous_hash = db.Column(db.String(500), nullable=False)
    receipt_hash = db.Column(db.String(500), nullable=False)
    signature = db.Column(db.String(1000), nullable=False)
    date_created = db.Column(db.DateTime, default=datetime.now)