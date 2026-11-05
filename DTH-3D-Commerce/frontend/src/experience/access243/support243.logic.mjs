/** Launcher eligibility only. Existing server session and ChatThread remain authoritative. */
export function supportAccess243({ mode, user, authLoading = false, authError = '', pathname = '/', identityEpoch = 0 } = {}) {
  const id = typeof user?.id === 'string' ? user.id : '';
  const path = typeof pathname === 'string' ? pathname : '/';
  const hiddenRoute = /^\/(?:admin|login)(?:\/|$)/.test(path);
  if (mode !== 'api' || !id || authLoading || authError || hiddenRoute) {
    return { visible: false, kind: 'hidden', contextKey: '' };
  }
  const kind = user.role === 'admin' ? 'admin' : 'customer';
  const epoch = Number.isSafeInteger(identityEpoch) && identityEpoch >= 0 ? identityEpoch : 0;
  return { visible: true, kind, contextKey: JSON.stringify([id, kind, epoch, path]) };
}

/** An open gesture belongs to its exact identity epoch and page, never a future session. */
export function supportIsOpen243(access, openedKey) {
  return Boolean(access?.visible && access.kind === 'customer' && access.contextKey && openedKey === access.contextKey);
}

export function supportThread243(access, thread) {
  return access?.visible && access.kind === 'customer' && thread?.contextKey === access.contextKey
    && typeof thread.id === 'string' && thread.id ? thread.id : '';
}
