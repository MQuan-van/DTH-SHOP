import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatMoney } from '../../../../../shared/domain.mjs';
import { useStore } from '../../useStore';
import { clampZoom, describeFit } from '../catalog.logic.mjs';
import { SHOP_CONFIG } from '../catalog.config.mjs';
import ProductImage from './ProductImage';
import ShopIcon from './ShopIcon';
import styles from '../ShopPage.module.css';

// Tất cả tính bằng mili giây.
const TRANSITION = {
  open: 680,
  close: 440,
  panel: 420,
  delay: 160,
};

const EASE = 'cubic-bezier(.22,.75,.2,1)';

// Tính vị trí và kích thước ảnh tương đối với vị trí đích.
function rectTransform(from, to) {
  return (
    `translate(${from.left - to.left}px, ${from.top - to.top}px) ` +
    `scale(${from.width / to.width}, ${from.height / to.height})`
  );
}

function createStageTransition(dialog, trigger, nodes, motion) {
  const { image, left, right, backdrop, tools } = nodes;

  const source = trigger?.closest('article')?.querySelector('img');
  const first = source?.getBoundingClientRect();

  const hasSource =
    source?.complete &&
    source.naturalWidth > 0 &&
    first?.width > 0;

  const oldVisibility = source?.style.visibility;
  const previousFocus = trigger || document.activeElement;

  const body = document.body;
  const oldOverflow = body.style.overflow;
  const oldPadding = body.style.paddingRight;
  const gap =
    window.innerWidth - document.documentElement.clientWidth;

  const preference = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  );

  let disposed = false;
  let closing = false;

  const animations = new Set();

  const allowMotion = () =>
    motion &&
    !preference.matches &&
    typeof image.animate === 'function';

  function play(element, frames, duration, delay = 0) {
    const animation = element.animate(frames, {
      duration,
      delay,
      easing: EASE,
      fill: 'both',
    });

    animations.add(animation);
    return animation;
  }

  const wait = list =>
    Promise.allSettled(list.map(animation => animation.finished));

  function cancel() {
    animations.forEach(animation => animation.cancel());
    animations.clear();
  }

  function finish() {
    animations.forEach(animation => {
      if (animation.playState !== 'finished') animation.finish();
    });
  }

  const panels = [
    [left, -52],
    [right, 52],
    [tools, 0],
  ];

  // Khóa cuộn nền, tránh nội dung nhảy khi thanh cuộn biến mất.
  body.style.overflow = 'hidden';

  if (gap > 0) {
    const padding = parseFloat(getComputedStyle(body).paddingRight);
    body.style.paddingRight = `${padding + gap}px`;
  }

  dialog.showModal();
  dialog.dataset.transition = 'running';

  window.addEventListener('resize', finish);
  dialog.addEventListener('scroll', finish, true);

  const reduce = () => {
    if (preference.matches) finish();
  };

  preference.addEventListener('change', reduce);

  if (allowMotion()) {
    const last = image.getBoundingClientRect();

    // Tránh nhìn thấy hai ảnh sản phẩm trong lúc chuyển cảnh.
    if (hasSource) source.style.visibility = 'hidden';

    const opening = [
      play(
        backdrop,
        [{ opacity: 0 }, { opacity: 1 }],
        TRANSITION.open
      ),

      play(
        image,
        [
          {
            transform: hasSource
              ? rectTransform(first, last)
              : 'scale(.94)',
            opacity: hasSource ? 1 : 0,
          },
          { transform: 'none', opacity: 1 },
        ],
        TRANSITION.open
      ),

      ...panels.map(([element, x]) =>
        play(
          element,
          [
            {
              opacity: 0,
              transform: `translateX(${x}px)`,
            },
            {
              opacity: 1,
              transform: 'none',
            },
          ],
          TRANSITION.panel,
          TRANSITION.delay
        )
      ),
    ];

    wait(opening).then(() => {
      if (disposed || closing) return;

      // Trạng thái CSS mặc định đã là trạng thái cuối.
      cancel();
      dialog.dataset.transition = 'idle';
    });
  } else {
    dialog.dataset.transition = 'idle';
  }

  return {
    async close() {
      if (closing || disposed) return false;

      closing = true;
      dialog.dataset.transition = 'running';

      // Cho phép đóng ngay cả khi animation mở chưa chạy xong.
      const current = image.getBoundingClientRect();
      const opacity = getComputedStyle(image).opacity;
      const shade = getComputedStyle(backdrop).opacity;

      const states = panels.map(([element, x]) => ({
        element,
        x,
        opacity: getComputedStyle(element).opacity,
        transform: getComputedStyle(element).transform,
      }));

      cancel();

      if (allowMotion()) {
        const base = image.getBoundingClientRect();
        const end = source?.isConnected
          ? source.getBoundingClientRect()
          : null;

        const returnToCard =
          hasSource &&
          end?.width > 0 &&
          end.bottom > 0 &&
          end.top < window.innerHeight;

        const leaving = [
          play(
            image,
            [
              {
                transform: rectTransform(current, base),
                opacity,
              },
              {
                transform: returnToCard
                  ? rectTransform(end, base)
                  : 'scale(.96)',
                opacity: returnToCard ? 1 : 0,
              },
            ],
            TRANSITION.close
          ),

          play(
            backdrop,
            [{ opacity: shade }, { opacity: 0 }],
            TRANSITION.close
          ),

          ...states.map(({ element, x, opacity, transform }) =>
            play(
              element,
              [
                { opacity, transform },
                {
                  opacity: 0,
                  transform: `translateX(${x}px)`,
                },
              ],
              200
            )
          ),
        ];

        // Dù người dùng đã zoom ảnh, lúc đóng vẫn thu về đúng 1x.
        const picture = image.querySelector('img');

        if (picture) {
          leaving.push(
            play(
              picture,
              [
                {
                  transform: getComputedStyle(picture).transform,
                  transformOrigin:
                    getComputedStyle(picture).transformOrigin,
                },
                {
                  transform: 'scale(1)',
                  transformOrigin: '50% 50%',
                },
              ],
              TRANSITION.close
            )
          );
        }

        await wait(leaving);
      }

      return !disposed;
    },

    dispose() {
      if (disposed) return;
      disposed = true;

      cancel();

      window.removeEventListener('resize', finish);
      dialog.removeEventListener('scroll', finish, true);
      preference.removeEventListener('change', reduce);

      if (source) source.style.visibility = oldVisibility;
      if (dialog.open) dialog.close();

      body.style.overflow = oldOverflow;
      body.style.paddingRight = oldPadding;

      if (
        previousFocus?.isConnected &&
        !document.querySelector('dialog[open]')
      ) {
        previousFocus.focus({ preventScroll: true });
      }
    },
  };
}

export default function QuickView({
  product,
  onClose,
  onChooseVehicle,
  motion,
  trigger,
}) {
  const { data, vehicleId, bag, add } = useStore();
  const navigate = useNavigate();
  const titleId = useId();

  const dialog = useRef(null);
  const image = useRef(null);
  const left = useRef(null);
  const right = useRef(null);
  const backdrop = useRef(null);
  const tools = useRef(null);
  const viewport = useRef(null);
  const session = useRef(null);

  const [quantity, setQuantity] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const match = describeFit(product, vehicleId, data.vehicles);
  const vehicle = data.vehicles.find(item => item.id === vehicleId);

  const category =
    SHOP_CONFIG.categories.find(
      item => item.id === product.category
    )?.label || product.category;

  const inBag =
    bag.find(
      item =>
        item.productId === product.id &&
        item.vehicleId === vehicleId
    )?.quantity || 0;

  const remaining = Math.max(0, 10 - inBag);
  const maxZoom = SHOP_CONFIG.motion.quickZoomMax;

  useLayoutEffect(() => {
    const controller = createStageTransition(
      dialog.current,
      trigger,
      {
        image: image.current,
        left: left.current,
        right: right.current,
        backdrop: backdrop.current,
        tools: tools.current,
      },
      motion
    );

    session.current = controller;

    return () => {
      controller.dispose();
      session.current = null;
    };
  }, [product.id, trigger, motion]);

  useEffect(() => {
    setQuantity(q => Math.max(1, Math.min(q, remaining)));
  }, [remaining]);

  async function dismiss(after) {
    const controller = session.current;

    if (!controller || !(await controller.close())) return;

    controller.dispose();
    session.current = null;

    onClose();
    after?.();
  }

  function openVehicle() {
    void dismiss(onChooseVehicle);
  }

  // function follow(event, url) {
  //   // Giữ hành vi mở tab mới bằng Ctrl/Cmd/Shift + click.
  //   if (
  //     event.button !== 0 ||
  //     event.ctrlKey ||
  //     event.metaKey ||
  //     event.shiftKey ||
  //     event.altKey
  //   ) {
  //     return;
  //   }

  //   event.preventDefault();
  //   void dismiss(() => navigate(url));
  // }
    function follow(event, url) {
    // Giữ hành vi mở tab mới bằng Ctrl/Cmd/Shift + click.
    if (
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();

    if (url.startsWith('/products/')) {
      const fromShop =
        window.location.pathname + window.location.search;

      // Đi sang trang chi tiết mà không thu ảnh về thẻ rồi phóng lại.
      session.current?.dispose();
      session.current = null;

      onClose();

      navigate(url, {
        state: { fromShop },
      });

      return;
    }

    // Các liên kết khác, ví dụ View bag, giữ hành vi đóng hiện có.
    void dismiss(() => navigate(url));
  }

  function setMagnification(value) {
    setZoom(clampZoom(value, maxZoom));

    if (value <= 1) {
      setOrigin({ x: 50, y: 50 });
    }
  }

  function moveImage(event) {
    if (
      zoom <= 1 ||
      (event.pointerType === 'touch' && event.buttons === 0)
    ) {
      return;
    }

    const rect = viewport.current.getBoundingClientRect();

    setOrigin({
      x: Math.max(
        0,
        Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)
      ),
      y: Math.max(
        0,
        Math.min(100, ((event.clientY - rect.top) / rect.height) * 100)
      ),
    });
  }

  function keyboardImage(event) {
    const keys = [
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      '+', '=', '-', 'Home',
    ];

    if (!keys.includes(event.key)) return;

    event.preventDefault();

    if (event.key === 'Home') return setMagnification(1);

    if (['+', '='].includes(event.key)) {
      return setMagnification(
        zoom + SHOP_CONFIG.motion.quickZoomStep
      );
    }

    if (event.key === '-') {
      return setMagnification(
        zoom - SHOP_CONFIG.motion.quickZoomStep
      );
    }

    if (zoom > 1) {
      setOrigin(value => ({
        x: Math.max(
          0,
          Math.min(
            100,
            value.x +
              (event.key === 'ArrowRight'
                ? 10
                : event.key === 'ArrowLeft' ? -10 : 0)
          )
        ),
        y: Math.max(
          0,
          Math.min(
            100,
            value.y +
              (event.key === 'ArrowDown'
                ? 10
                : event.key === 'ArrowUp' ? -10 : 0)
          )
        ),
      }));
    }
  }

  function buy() {
    setMessage('');
    setError('');

    if (match.status !== 'compatible') return openVehicle();

    if (!remaining || quantity > remaining) {
      setError('Demo limit: 10 items per product and vehicle.');
      return;
    }

    if (add(product, vehicleId, quantity)) {
      setMessage(
        `${quantity} × ${product.name} added to your bag.`
      );
    } else {
      setError(
        'Could not add this item. Check the vehicle and demo bag limits.'
      );
    }
  }

  return (
    <dialog
      ref={dialog}
      className={`${styles.dialog} ${styles.inspectDialog}`}
      aria-labelledby={titleId}
      data-motion={motion ? 'on' : 'off'}
      onCancel={event => {
        event.preventDefault();
        void dismiss();
      }}
    >
      <div
        ref={backdrop}
        className={styles.inspectBackdrop}
        aria-hidden="true"
      />

      <div className={styles.inspectScroll}>
        <header className={styles.inspectHeader}>
          <span>DTH / PRODUCT PREVIEW</span>

          <button
            autoFocus
            type="button"
            className={styles.outlineButton}
            onClick={() => void dismiss()}
          >
            <ShopIcon name="close" />
            Back to parts
          </button>
        </header>

        <div className={styles.inspectLayout}>
          {/* Thông tin trượt vào từ bên trái. */}
          <section ref={left} className={styles.inspectLeft}>
            <p className={styles.eyebrow}>{category}</p>

            <h2 id={titleId}>{product.name}</h2>

            <p className={styles.quickDescription}>
              {product.description}
            </p>

            <p className={styles.quickFinish}>
              <span>Finish</span>
              <strong>{product.finish}</strong>
            </p>

            <p className={styles.demoFinePrint}>
              Illustrative product. Not measured specifications.
            </p>
          </section>

          {/* Sản phẩm phóng từ thẻ vào giữa màn hình. */}
          <div className={styles.inspectVisual}>
            <div
              ref={viewport}
              className={styles.inspectViewport}
              role="region"
              tabIndex="0"
              aria-label="Product image. Plus or minus to zoom, arrow keys to pan, Home to reset."
              style={{
                '--image-zoom': zoom,
                '--origin-x': `${origin.x}%`,
                '--origin-y': `${origin.y}%`,
                touchAction: zoom > 1 ? 'none' : 'pan-y',
              }}
              onKeyDown={keyboardImage}
              onPointerMove={moveImage}
              onPointerDown={event => {
                if (zoom > 1 && event.pointerType === 'touch') {
                  event.currentTarget.setPointerCapture(
                    event.pointerId
                  );
                }
              }}
            >
              <div ref={image} className={styles.inspectProduct}>
                <ProductImage
                  product={product}
                  className={styles.inspectImage}
                  eager
                />
              </div>
            </div>

            <div ref={tools}>
              <div
                className={styles.zoomBar}
                role="group"
                aria-label="Product image zoom"
              >
                <button
                  type="button"
                  className={styles.iconButton}
                  disabled={zoom <= 1}
                  aria-label="Zoom out"
                  onClick={() =>
                    setMagnification(
                      zoom - SHOP_CONFIG.motion.quickZoomStep
                    )
                  }
                >
                  <ShopIcon name="minus" />
                </button>

                <output aria-live="polite">
                  {zoom.toFixed(2)}×
                </output>

                <button
                  type="button"
                  className={styles.iconButton}
                  disabled={zoom >= maxZoom}
                  aria-label="Zoom in"
                  onClick={() =>
                    setMagnification(
                      zoom + SHOP_CONFIG.motion.quickZoomStep
                    )
                  }
                >
                  <ShopIcon name="plus" />
                </button>

                <button
                  type="button"
                  className={styles.resetZoom}
                  onClick={() => setMagnification(1)}
                >
                  <ShopIcon name="reset" />
                  Reset
                </button>
              </div>

              <p className={styles.zoomHelp}>
                Image preview · Open the product page for
                interactive 3D.
              </p>
            </div>
          </div>

          {/* Giá và mua hàng trượt vào từ bên phải. */}
          <section
            ref={right}
            className={styles.inspectRight}
            aria-label="Price and purchase"
          >
            <div className={styles.quickPrice}>
              <strong>{formatMoney(product.price)}</strong>
              <span>Demo price · VND</span>
            </div>

            <div className={styles.quickFit}>
              <p
                className={styles.fitBadge}
                data-status={match.status}
              >
                <ShopIcon
                  name={
                    match.status === 'compatible'
                      ? 'check'
                      : 'vehicle'
                  }
                />
                {match.label}
              </p>

              <p>
                {vehicle
                  ? `${vehicle.make} · ${vehicle.model} · ${vehicle.year}`
                  : 'Choose a vehicle to check fit.'}
              </p>

              <button
                type="button"
                className={styles.textButton}
                onClick={openVehicle}
              >
                {vehicle ? 'Change vehicle' : 'Choose vehicle'}
                <ShopIcon name="arrow" />
              </button>
            </div>

            <div className={styles.buyRow}>
              <label>
                Quantity
                <select
                  value={quantity}
                  disabled={remaining === 0}
                  onChange={event => {
                    setQuantity(Number(event.target.value));
                    setMessage('');
                  }}
                >
                  {Array.from(
                    { length: Math.max(1, remaining) },
                    (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}
                      </option>
                    )
                  )}
                </select>
              </label>

              <button
                type="button"
                className={styles.primaryButton}
                disabled={
                  match.status === 'compatible' && remaining === 0
                }
                onClick={buy}
              >
                <ShopIcon
                  name={
                    match.status === 'compatible'
                      ? 'bag'
                      : 'vehicle'
                  }
                />

                {match.status !== 'compatible'
                  ? 'Select matching vehicle'
                  : remaining === 0
                    ? 'Demo limit reached'
                    : 'Add to bag'}
              </button>
            </div>

            <div
              className={styles.quickStatus}
              role="status"
              aria-live="polite"
            >
              {message && (
                <>
                  <span>
                    <ShopIcon name="check" />
                    {message}
                  </span>

                  <Link
                    to="/bag"
                    onClick={event => follow(event, '/bag')}
                  >
                    View bag
                    <ShopIcon name="arrow" />
                  </Link>
                </>
              )}
            </div>

            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}

            <Link
              className={styles.outlineButton}
              to={`/products/${product.slug}`}
              onClick={event =>
                follow(event, `/products/${product.slug}`)
              }
            >
              <ShopIcon name="cube" />
              Open product &amp; 3D
              <ShopIcon name="arrowUp" />
            </Link>

            <p className={styles.demoFinePrint}>
              Synthetic fitment · No real payments or shipping.
            </p>
          </section>
        </div>
      </div>
    </dialog>
  );
}