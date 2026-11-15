import { SITE } from '../config/site'

/** Opens the visitor's email app with LIFELINE's address and a subject filled in. */
export const EMAIL_ENQUIRY_URL = `mailto:${SITE.email}?subject=${encodeURIComponent('Project enquiry from the LIFELINE Demo Studio')}`
