from enum import Enum


class TaxCategory(str, Enum):
    STANDARD = 'STANDARD'
    ZERO_RATED = 'ZERO_RATED'
    EXEMPT = 'EXEMPT'
