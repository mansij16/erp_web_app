export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone) => {
  const phoneRegex = /^[0-9]{10}$/;
  return phoneRegex.test(phone);
};

export const isValidGSM = (gsm) => {
  return !isNaN(gsm) && Number(gsm) > 0;
};

export const isValidWidth = (width) => {
  return [24, 36, 44, 63].includes(Number(width));
};

export const isValidLength = (length) => {
  return [1000, 1500, 2000].includes(Number(length));
};

export const isPositiveNumber = (value) => {
  return !isNaN(value) && Number(value) > 0;
};

export const isValidDate = (date) => {
  return date instanceof Date && !isNaN(date);
};

export const validateRequired = (value, fieldName) => {
  if (!value || (typeof value === "string" && value.trim() === "")) {
    return `${fieldName} is required`;
  }
  return null;
};

export const validateMinLength = (value, minLength, fieldName) => {
  if (value && value.length < minLength) {
    return `${fieldName} must be at least ${minLength} characters`;
  }
  return null;
};

export const validateMaxLength = (value, maxLength, fieldName) => {
  if (value && value.length > maxLength) {
    return `${fieldName} must be less than ${maxLength} characters`;
  }
  return null;
};
