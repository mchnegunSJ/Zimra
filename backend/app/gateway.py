# Placeholder for ZIMRA gateway / mTLS communication logic.
# In a real deployment, this module would handle outgoing requests to the
# fiscal device/ZIMRA endpoint using client certificates from the keys folder.


def send_to_zimra(payload: dict) -> dict:
    """Stubbed gateway call.

    For now, just echoes the payload back.
    """
    return {'status': 'ok', 'echo': payload}
