"""Close the new bag drawer before an older regression resumes page interactions.
The dedicated cart_drawer.py covers drawer actions. No commerce assertions are removed.
"""
from playwright.sync_api import expect

def close_added_cart(page):
    cart = page.locator('dialog[data-cart-dialog][open]')
    expect(cart).to_be_visible(timeout=8000)
    expect(page.locator('dialog[open]')).to_have_count(1)
    cart.get_by_role('button', name='Close bag', exact=True).click()
    expect(cart).to_have_count(0)
