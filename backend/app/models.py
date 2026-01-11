from . import db
from datetime import datetime


class DeviceConfig(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    # Core device identity
    device_id = db.Column(db.String(50), unique=True)
    serial_number = db.Column(db.String(50))
    current_fiscal_day = db.Column(db.Integer, default=0)
    is_day_open = db.Column(db.Boolean, default=False)

    # Chain state: store the last receipt's hash to link the chain
    last_receipt_hash = db.Column(db.String(500), default="0")

    # Fiscal memory / ZIMRA registration identity
    tax_payer_name = db.Column(
        db.String(255),
        nullable=False,
        default="Big Old Cravings & Bakeries Pvt Ltd",
    )
    trade_name = db.Column(
        db.String(255),
        nullable=False,
        default="Big Old Cravings",
    )
    bp_number = db.Column(
        db.String(50),
        nullable=False,
        default="200123456",
    )
    vat_number = db.Column(
        db.String(50),
        nullable=False,
        default="100123456",
    )
    address = db.Column(
        db.String(255),
        nullable=False,
        default="123 Main Street, Bulawayo",
    )


class Receipt(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    fiscal_day_no = db.Column(db.Integer, nullable=False)
    global_no = db.Column(db.Integer, unique=True, nullable=False)
    invoice_no = db.Column(db.String(50), nullable=False)
    
    total_amount = db.Column(db.Float, nullable=False)
    tax_amount = db.Column(db.Float, nullable=False)
    
    # The Chain
    previous_hash = db.Column(db.String(500), nullable=False)
    receipt_hash = db.Column(db.String(500), nullable=False)
    signature = db.Column(db.String(1000), nullable=False)
    qr_code_url = db.Column(db.String(1000))
    
    date_created = db.Column(db.DateTime, default=datetime.now)