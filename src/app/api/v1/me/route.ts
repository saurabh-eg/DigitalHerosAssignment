import * as authController from "@/modules/auth/auth.controller";

export function GET() {
  return authController.me();
}
