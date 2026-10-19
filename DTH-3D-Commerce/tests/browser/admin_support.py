"""Two isolated real browser sessions, actual API/SSE and an isolated MongoDB. No mock happy-path transport."""
import os,json,subprocess,uuid,re
from urllib.parse import quote,urlsplit,parse_qs
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from cart_helpers import close_added_cart
expect.set_options(timeout=20000)
uri=os.environ.get('MONGO_URI','')
assert re.fullmatch(r'mongodb://127\.0\.0\.1:\d+/dth_admin_browser_test',uri),'Refusing a non-test database'
base=os.environ.get('DTH_BROWSER_URL','http://127.0.0.1:5000')
out=Path('test-results/admin-support');out.mkdir(parents=True,exist_ok=True)
checks,errors=[],[]
password='Support browser test 2026!'
admin_email='studio-agent-'+uuid.uuid4().hex[:6]+'@example.test'
customer_email='studio-customer-'+uuid.uuid4().hex[:6]+'@example.test'
def ok(name):checks.append(name);print('PASS:',name,flush=True)
def shot(page,name):page.wait_for_timeout(350);page.screenshot(path=str(out/(name+'.png')),full_page=True)
def fit(page):assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'),'Horizontal page overflow'
def login(page,email,role,destination):
    page.goto(base+'/login?return='+quote(destination,safe=''))
    access=page.locator('[data-access181][data-mode="api"]');expect(access).to_be_visible()
    access.get_by_label('Email',exact=True).fill(email);access.get_by_label('Password',exact=True).fill(password)
    with page.expect_response(lambda response:response.url==base+'/api/shop/auth/login' and response.request.method=='POST') as result:
        access.get_by_role('button',name='Sign in',exact=True).click()
    response=result.value;assert response.ok;assert response.json()['user']['role']==role
    page.wait_for_url(base+destination)
    assert page.request.get(base+'/api/shop/auth/me').json()['user']['email']==email

def conversation_row(page):
    return page.get_by_role('complementary',name='Conversation queue').get_by_role('button').filter(has_text=customer_email)
setup="""import {mongoUri} from './backend/commerce/config.mjs';import mongoose from 'mongoose';import {User} from './backend/commerce/models.mjs';import {hashPassword} from './backend/commerce/security.mjs';await mongoose.connect(mongoUri);for(const [email,role] of [[process.env.ADMIN_EMAIL,'admin'],[process.env.CUSTOMER_EMAIL,'customer']])await User.create({email,role,passwordHash:await hashPassword(process.env.TEST_PASSWORD),disabled:false});await mongoose.disconnect();"""
subprocess.run(['node','--input-type=module','-e',setup],check=True,env={**os.environ,'ADMIN_EMAIL':admin_email,'CUSTOMER_EMAIL':customer_email,'TEST_PASSWORD':password})
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    ac=browser.new_context(viewport={'width':1600,'height':1000});cc=browser.new_context(viewport={'width':1280,'height':920})
    admin=ac.new_page();customer=cc.new_page()
    for page in [admin,customer]:page.set_default_timeout(20000);page.on('pageerror',lambda e:errors.append(str(e)))
    try:
        login(admin,admin_email,'admin','/admin')
        expect(admin.locator('[data-admin-pro="overview"] h1')).to_have_text('Your studio.In motion.')
        login(customer,customer_email,'customer','/shop');ok('Actual account login in two isolated cookie sessions with safe role destinations')
        fit(admin);shot(admin,'01-admin-overview');expect(admin.get_by_role('navigation',name='Admin navigation')).to_be_visible();ok('Separate modular admin shell and data-driven overview')
        customer.goto(base+'/admin');expect(customer.get_by_role('heading',name='Administrator access required.')).to_be_visible()
        assert customer.request.get(base+'/api/shop/admin/studio/overview').status==403;ok('Customer is denied admin UI and API')
        customer.goto(base+'/shop');customer.get_by_role('button',name='Open support',exact=True).click()
        expect(customer.get_by_role('textbox',name='Message',exact=True)).to_be_visible();expect(customer.get_by_text('Live connection',exact=True)).to_be_visible()
        admin.goto(base+'/admin/inbox');expect(admin.locator('[data-admin-pro="inbox"] h1')).to_have_text('Inbox.Closer to the rider.')
        text='Chào DTH, tôi muốn kiểm tra phuộc cho Yamaha NVX V1.'
        customer.get_by_role('textbox',name='Message',exact=True).fill(text);customer.get_by_role('button',name='Send ↗',exact=True).click()
        row=conversation_row(admin);expect(row).to_be_visible();expect(row.locator('b')).to_have_text('1')
        row.click();expect(admin.locator('.dth-chat-bubble').filter(has_text=text)).to_be_visible();ok('Customer text reaches admin live without refresh; unread badge updates')
        admin.bring_to_front();admin.get_by_role('textbox',name='Message',exact=True).fill('DTH đang kiểm tra mẫu xe của bạn.');expect(customer.get_by_text('Support is typing…',exact=False)).to_be_visible()
        admin.get_by_role('button',name='Send ↗',exact=True).click();expect(customer.locator('.dth-chat-bubble').filter(has_text='DTH đang kiểm tra mẫu xe')).to_be_visible();ok('Admin typing indicator and immediate reply reach customer')
        image=str(Path('frontend/public/previews/home-stage/apex-suspension.png').resolve())
        customer.get_by_label('Attach image',exact=True).set_input_files(image);expect(customer.get_by_alt_text('Selected image preview')).to_be_visible()
        customer.get_by_role('textbox',name='Message',exact=True).fill('Đây là hình phụ tùng tôi muốn hỏi.');customer.get_by_role('button',name='Send ↗',exact=True).click()
        expect(admin.get_by_alt_text('Shared support image')).to_be_visible();admin.wait_for_function("Array.from(document.querySelectorAll('.dth-chat-image img')).every(e=>e.complete&&e.naturalWidth>0)")
        admin.get_by_role('button',name='Enlarge shared image',exact=True).click();expect(admin.get_by_role('dialog',name='Support image')).to_be_visible();admin.get_by_role('button',name='Close image ×',exact=True).click();ok('Image upload, server re-encoding, live delivery and lightbox')
        admin.get_by_label('Attach image',exact=True).set_input_files(image);admin.get_by_role('textbox',name='Message',exact=True).fill('Bạn có thể xem ảnh này để đối chiếu.');admin.get_by_role('button',name='Send ↗',exact=True).click()
        expect(customer.get_by_alt_text('Shared support image')).to_have_count(2);ok('Admin sends image attachments back to customer')
        admin.bring_to_front();admin.get_by_role('textbox',name='Message',exact=True).focus();customer.bring_to_front();customer.get_by_role('textbox',name='Message',exact=True).focus()
        expect(customer.locator('.dth-chat-message small').filter(has_text='Seen').first).to_be_visible();ok('Visible conversation advances read receipts')
        shot(admin,'02-admin-inbox');shot(customer,'03-customer-support')
        customer.reload();customer.get_by_role('button',name='Open support',exact=True).click();expect(customer.locator('.dth-chat-bubble').filter(has_text=text)).to_be_visible();expect(customer.get_by_alt_text('Shared support image')).to_have_count(2)
        admin.reload();expect(admin.locator('.dth-chat-bubble').filter(has_text=text)).to_be_visible();ok('Messages and images reload from MongoDB in both sessions')
        admin.get_by_role('button',name='Resolve',exact=True).click();expect(admin.get_by_role('button',name='Reopen',exact=True)).to_be_visible()
        customer.get_by_role('textbox',name='Message',exact=True).fill('Cảm ơn, tôi có một câu hỏi nữa.');customer.get_by_role('button',name='Send ↗',exact=True).click();expect(admin.get_by_role('button',name='Resolve',exact=True)).to_be_visible();ok('Resolve and automatic reopen on new customer message')
        cc.set_offline(True);expect(customer.get_by_text('Reconnecting — messages may be delayed',exact=True)).to_be_visible()
        admin.get_by_role('textbox',name='Message',exact=True).fill('Tin nhắn được gửi khi khách mất kết nối.');admin.get_by_role('button',name='Send ↗',exact=True).click()
        cc.set_offline(False);expect(customer.locator('.dth-chat-bubble').filter(has_text='Tin nhắn được gửi khi khách mất kết nối.')).to_be_visible();ok('SSE reconnect retrieves messages missed while offline')
        blocked={'once':False}
        def fail_once(route):
            if route.request.method=='POST' and re.search(r'/chat/conversations/[^/]+/messages$',route.request.url) and not blocked['once']:
                blocked['once']=True;route.abort()
            else:route.continue_()
        customer.route('**/api/shop/chat/conversations/*/messages',fail_once)
        customer.get_by_role('textbox',name='Message',exact=True).fill('Retry preserves this message.');customer.get_by_role('button',name='Send ↗',exact=True).click()
        expect(customer.get_by_role('button',name='Retry message',exact=True)).to_be_visible();customer.get_by_role('button',name='Retry message',exact=True).click()
        expect(admin.locator('.dth-chat-bubble').filter(has_text='Retry preserves this message.')).to_have_count(1)
        customer.unroute('**/api/shop/chat/conversations/*/messages',fail_once);ok('Failed request retains draft; retry creates one message')
        lost={'once':False}
        def lose_ack(route):
            if route.request.method=='POST' and not lost['once']:
                lost['once']=True;response=route.fetch();assert response.ok;route.abort()
            else:route.continue_()
        customer.route('**/api/shop/chat/conversations/*/messages',lose_ack)
        customer.get_by_role('textbox',name='Message',exact=True).fill('The stream confirms a lost acknowledgement.');customer.get_by_role('button',name='Send ↗',exact=True).click()
        expect(customer.locator('.dth-chat-bubble').filter(has_text='The stream confirms a lost acknowledgement.')).to_have_count(1)
        expect(customer.get_by_role('textbox',name='Message',exact=True)).to_be_enabled();expect(customer.get_by_role('textbox',name='Message',exact=True)).to_have_value('')
        expect(admin.locator('.dth-chat-bubble').filter(has_text='The stream confirms a lost acknowledgement.')).to_have_count(1)
        customer.unroute('**/api/shop/chat/conversations/*/messages',lose_ack);ok('Persisted SSE message reconciles lost POST acknowledgement without duplicate bubble')
        customer.get_by_role('button',name='Close support',exact=True).click()
        customer.locator('.dth-header .dth-vehicle-button').click()
        picker=customer.get_by_role('dialog',name='Choose your Yamaha NVX');picker.get_by_role('radio',name='NVX V1',exact=True).check();picker.get_by_role('button',name='Use NVX V1',exact=True).click()
        customer.goto(base+'/products/apex-suspension');customer.get_by_role('button',name='Add to bag',exact=True).click();close_added_cart(customer)
        customer.goto(base+'/bag');customer.get_by_role('button',name='Review order',exact=True).click();customer.get_by_role('checkbox').check();customer.get_by_role('button',name='Continue to checkout',exact=True).click()
        expect(customer).to_have_url(base+'/checkout')
        for label,value in [('Recipient name','Fictitious support customer'),('Phone','0900000000'),('Address','1 Disposable Test Street'),('City','Test City')]:customer.get_by_label(label,exact=True).fill(value)
        customer.get_by_role('checkbox').check();customer.get_by_role('button',name='Place demo order',exact=True).click();customer.wait_for_url('**/order-complete?order=DTH-*')
        order_id=parse_qs(urlsplit(customer.url).query)['order'][0]
        admin.goto(base+'/admin/orders');admin.get_by_label('Search admin orders',exact=True).fill(order_id);admin.get_by_role('button',name='Search',exact=True).click()
        admin.get_by_role('link',name=order_id,exact=True).click();expect(admin.get_by_role('heading',name='Order detail',exact=True)).to_be_visible();expect(admin.locator('.dth-admin-panel')).to_contain_text(customer_email);expect(admin.locator('.dth-admin-table')).to_contain_text('Apex Coilover');expect(admin.locator('.dth-admin-table')).to_contain_text('yamaha-nvx-v1')
        assert customer.request.get(base+'/api/shop/admin/studio/orders/'+order_id).status==403
        ok('Actual customer checkout persists a demo order for read-only admin detail; customer admin access stays forbidden')
        admin.goto(base+'/admin/products');expect(admin.get_by_role('heading',name='Products',exact=True)).to_be_visible();shot(admin,'04-admin-products')
        admin.locator('.dth-admin-product-name').filter(has_text='apex-suspension').click();expect(admin.get_by_label('Name',exact=True)).to_have_value('Apex Coilover')
        admin.get_by_label('Name',exact=True).fill('Apex Coilover Studio');admin.get_by_role('button',name='Save product ↗',exact=True).click();expect(admin.get_by_text('Product saved.',exact=True)).to_be_visible()
        customer.goto(base+'/shop');expect(customer.get_by_role('heading',name='Apex Coilover Studio',exact=True)).to_be_visible()
        admin.get_by_label('Name',exact=True).fill('Apex Coilover');admin.get_by_role('button',name='Save product ↗',exact=True).click();expect(admin.get_by_text('Product saved.',exact=True)).to_be_visible();ok('Product edit persists and storefront reads the changed record')
        admin.get_by_role('button',name='Inspect 3D',exact=True).click();expect(admin.get_by_text('Interactive 3D ready',exact=True)).to_be_visible();shot(admin,'05-admin-product-editor');ok('Product editor loads actual 3D preview on demand')
        for width in [390,768,1440]:
            admin.set_viewport_size({'width':width,'height':950})
            for path in ['/admin','/admin/products','/admin/vehicles','/admin/orders','/admin/inbox']:
                admin.goto(base+path);expect(admin.locator('.dth-admin h1')).to_be_visible();admin.wait_for_timeout(400);fit(admin)
            if width==390:
                conversation_row(admin).click();expect(admin.get_by_role('textbox',name='Message',exact=True)).to_be_visible();fit(admin);shot(admin,'06-admin-inbox-mobile')
                admin.get_by_role('button',name='Back to conversations',exact=True).click();expect(conversation_row(admin)).to_be_visible()
        ok('Admin pages fit 390 / 768 / 1440 and mobile Inbox navigation works')
        customer.set_viewport_size({'width':390,'height':850});customer.goto(base+'/shop');customer.get_by_role('button',name='Open support',exact=True).click();expect(customer.get_by_role('textbox',name='Message',exact=True)).to_be_visible();fit(customer);shot(customer,'07-customer-mobile')
        customer.emulate_media(reduced_motion='reduce');customer.get_by_role('button',name='Close support',exact=True).click();customer.get_by_role('button',name='Open support',exact=True).click();assert customer.locator('.dth-support-panel').evaluate('e=>getComputedStyle(e).animationName')=='none';ok('Support panel respects reduced motion')
        assert not errors,errors;ok('No uncaught browser exceptions across tested flows')
    except Exception:
        shot(admin,'failure-admin');shot(customer,'failure-customer');(out/'failure-admin.html').write_text(admin.content(),encoding='utf8');(out/'failure-customer.html').write_text(customer.content(),encoding='utf8');raise
    finally:
        (out/'results.json').write_text(json.dumps({'checks':checks,'browserErrors':errors,'transport':'Actual EventSource + HTTP writes','database':'Isolated test MongoDB','mockedHappyPath':False},ensure_ascii=False,indent=2),encoding='utf8');browser.close()
