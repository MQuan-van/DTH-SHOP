/** Photos supplied by the project owner. Never inferred as fitment or product provenance. */
const photo = (id, alt, position = '50% 65%') => Object.freeze({
  id, alt, position,
  src: `/discovery174/${id}-1280.webp`,
  srcSet: `/discovery174/${id}-640.webp 640w, /discovery174/${id}-1280.webp ${id === 'titanium' ? 1086 : 1280}w`,
});
export const PHOTOS = Object.freeze({
  street: photo('street', 'White community scooter parked beside a stone wall', '50% 72%'),
  titanium: photo('titanium', 'Owner-supplied NVX V2 collage, with wheel, suspension and handlebar details', '50% 50%'),
  crew: photo('crew', 'Two community scooters in a sunlit street with DTH artwork', '50% 77%'),
  workshop: photo('workshop', 'DTH owner artwork showing front and rear views of a white scooter', '50% 50%'),
  mechanical: photo('mechanical', 'Dark scooter and an inset photograph of its rear suspension and exhaust', '66% 63%'),
  afterhours: photo('afterhours', 'White scooter photographed at night with illuminated front lights', '50% 72%'),
  light: photo('light', 'Close front view of a white scooter with illuminated lights at night', '50% 70%'),
  bluehour: photo('bluehour', 'Blue and white community scooter on a city street after dark', '50% 70%'),
});
export const MOODS = Object.freeze([
  { id: 'street', label: 'Daylight', title: 'A ride of\nyour own.', photo: PHOTOS.street, detail: 'DTH / RIDER CULTURE' },
  { id: 'afterhours', label: 'After hours', title: 'Own the\nnight.', photo: PHOTOS.afterhours, detail: 'DTH / AFTER HOURS' },
  { id: 'mechanical', label: 'Details', title: 'Small parts.\nBig character.', photo: PHOTOS.mechanical, detail: 'DTH / THE DETAILS' },
]);
// Only these two versions are identified in filenames supplied by the owner.
export const VEHICLE_PHOTOS = Object.freeze({ 'yamaha-nvx-v1': PHOTOS.street, 'yamaha-nvx-v2': PHOTOS.titanium });
export const CATEGORY_NAMES = Object.freeze({ wheels: 'Wheels', brakes: 'Brakes', suspension: 'Suspension', exhausts: 'Exhausts', mirrors: 'Mirrors' });
export const CATEGORY_ORDER = Object.freeze(['wheels', 'brakes', 'suspension', 'exhausts', 'mirrors']);
export const DISCOVERY_MOTION = Object.freeze({ enterMs: 440, staggerMs: 45, parallaxPx: 7, ease: 'cubic-bezier(.16,1,.3,1)' });
