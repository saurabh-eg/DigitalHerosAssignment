import * as authController from "@/modules/auth/auth.controller";

export function GET(request: Request) {
  return authController.emailCallback(request);
}
