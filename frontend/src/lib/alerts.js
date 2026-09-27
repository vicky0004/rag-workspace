import Swal from 'sweetalert2';

// Theme-aware customized SweetAlert instance
const customSwal = Swal.mixin({
  background: '#161b27',
  color: '#e8eaf2',
  confirmButtonColor: '#6366f1',
  cancelButtonColor: '#252d3f',
  customClass: {
    popup: 'swal-custom-popup',
    title: 'swal-custom-title',
    htmlContainer: 'swal-custom-html',
    confirmButton: 'btn-primary swal-btn',
    cancelButton: 'btn-secondary swal-btn',
  },
  buttonsStyling: false,
});

/**
 * Modern Confirm Dialog
 */
export async function showConfirmDialog({
  title = 'Are you sure?',
  text = '',
  confirmText = 'Yes, delete',
  cancelText = 'Cancel',
  icon = 'warning',
  danger = true,
}) {
  const result = await customSwal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    reverseButtons: true,
    focusCancel: true,
    iconColor: danger ? '#ef4444' : '#6366f1',
    customClass: {
      confirmButton: danger ? 'btn-danger swal-btn' : 'btn-primary swal-btn',
      cancelButton: 'btn-secondary swal-btn',
    },
  });

  return result.isConfirmed;
}

/**
 * Modern Toast Notification
 */
export function showToast({ title, icon = 'success', timer = 2500 }) {
  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer,
    timerProgressBar: true,
    background: '#1e253a',
    color: '#e8eaf2',
    iconColor: icon === 'success' ? '#22c55e' : icon === 'error' ? '#ef4444' : '#6366f1',
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
    },
  });

  Toast.fire({
    icon,
    title,
  });
}

/**
 * Modern Error Alert
 */
export function showErrorAlert(title, text = '') {
  return customSwal.fire({
    icon: 'error',
    title,
    text,
    confirmButtonText: 'Okay',
  });
}

/**
 * Modern Success Alert
 */
export function showSuccessAlert(title, text = '') {
  return customSwal.fire({
    icon: 'success',
    title,
    text,
    confirmButtonText: 'Great!',
  });
}

export default customSwal;
