export const LOGIN_PHASES = Object.freeze(['idle', 'identify', 'password', 'register', 'working', 'error']);

export function loginPhase({ field = '', registering = false, busy = false, error = false } = {}) {
  if (busy) return 'working';
  if (error) return 'error';
  if (field === 'password') return 'password';
  if (field === 'confirm' || registering) return 'register';
  if (field === 'email') return 'identify';
  return 'idle';
}
