/** Error codes returned by the Edge Functions (see README: Edge Functions). */
export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
    /** For `validation_failed`: { [fieldId]: string[] } */
    public details?: Record<string, string[]>,
  ) {
    super(code);
  }
}

const MESSAGES: Record<string, string> = {
  network_error: "Couldn't reach the server. Check your connection and try again.",
  sign_in_required: "You need to sign in to submit this form.",
  form_closed: "This form is no longer accepting responses.",
  form_not_found: "This form doesn't exist.",
  response_limit_reached: "This form has reached its response limit.",
  already_submitted: "You've already submitted a response to this form.",
  schema_changed:
    "This form was updated while you were filling it in. Reload the page and try again.",
  payload_too_large: "Your response is too large to submit.",
  file_too_large: "That file is too large.",
  file_type_not_allowed: "That file type isn't allowed.",
  captcha_required: "Please complete the verification check.",
  captcha_failed: "Verification failed. Please try again.",
  upload_failed: "The upload failed. Please try again.",
};

export function describeApiError(e: unknown): string {
  if (e instanceof ApiError) return MESSAGES[e.code] ?? "Something went wrong. Please try again.";
  return "Something went wrong. Please try again.";
}
