export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL - use custom auth instead of Manus OAuth
export const getLoginUrl = () => {
  return "/login";
};
