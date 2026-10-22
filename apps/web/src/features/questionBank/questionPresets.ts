import type { FieldTemplate } from "./questionBankApi.ts";

export type QuestionPreset = {
  id: string;
  title: string;
  category: "Contact Info" | "Feedback & Ratings" | "Choice & Selection" | "Files & Media";
  description: string;
  field: FieldTemplate;
};

export const QUESTION_PRESETS: QuestionPreset[] = [
  // --- Contact Info ---
  {
    id: "preset-full-name",
    title: "Full Name",
    category: "Contact Info",
    description: "Standard text input for person's first and last name",
    field: {
      type: "short_text",
      label: "Full Name",
      required: true,
      validation: { minLength: 2, maxLength: 100 },
    },
  },
  {
    id: "preset-email",
    title: "Email Address",
    category: "Contact Info",
    description: "Email input with automatic format validation",
    field: {
      type: "short_text",
      label: "Email Address",
      helpText: "We will only use this to contact you regarding your submission.",
      required: true,
      validation: { format: "email" },
    },
  },
  {
    id: "preset-phone",
    title: "Phone Number",
    category: "Contact Info",
    description: "Phone number field with international format guidance",
    field: {
      type: "short_text",
      label: "Phone Number",
      helpText: "Include your country/area code if outside the country.",
      required: false,
      validation: { maxLength: 25 },
    },
  },
  {
    id: "preset-company",
    title: "Company or Organization",
    category: "Contact Info",
    description: "Single-line input for organization name",
    field: {
      type: "short_text",
      label: "Company / Organization",
      required: false,
      validation: { maxLength: 100 },
    },
  },
  {
    id: "preset-address",
    title: "Mailing Address",
    category: "Contact Info",
    description: "Multi-line text box for physical or shipping address",
    field: {
      type: "long_text",
      label: "Mailing Address",
      helpText: "Street Address, Apt / Suite, City, State / Province, Postal Code, Country",
      required: false,
      validation: {},
    },
  },
  {
    id: "preset-website",
    title: "Website or Portfolio URL",
    category: "Contact Info",
    description: "URL field for personal or business link",
    field: {
      type: "short_text",
      label: "Website or Portfolio",
      required: false,
      validation: { format: "url" },
    },
  },

  // --- Feedback & Ratings ---
  {
    id: "preset-nps",
    title: "Net Promoter Score (NPS 0-10)",
    category: "Feedback & Ratings",
    description: "Standard 0 to 10 likelihood to recommend scale",
    field: {
      type: "linear_scale",
      label: "How likely are you to recommend us to a friend or colleague?",
      required: true,
      min: 0,
      max: 10,
      labels: {
        min: "Not at all likely",
        max: "Extremely likely",
      },
    },
  },
  {
    id: "preset-satisfaction-5",
    title: "Satisfaction Rating (1-5)",
    category: "Feedback & Ratings",
    description: "5-point satisfaction score with custom anchor labels",
    field: {
      type: "linear_scale",
      label: "Overall, how satisfied are you with our service?",
      required: true,
      min: 1,
      max: 5,
      labels: {
        min: "Very Dissatisfied",
        max: "Very Satisfied",
      },
    },
  },
  {
    id: "preset-experience-choice",
    title: "Experience Quality",
    category: "Feedback & Ratings",
    description: "Multiple choice options from Excellent down to Poor",
    field: {
      type: "multiple_choice",
      label: "How would you rate your overall experience?",
      required: true,
      options: [
        { id: "opt_1", label: "⭐️ Excellent" },
        { id: "opt_2", label: "👍 Good" },
        { id: "opt_3", label: "😐 Average" },
        { id: "opt_4", label: "👎 Poor" },
      ],
    },
  },
  {
    id: "preset-suggestions",
    title: "Suggestions & Feedback",
    category: "Feedback & Ratings",
    description: "Open-ended paragraph for feedback and ideas",
    field: {
      type: "long_text",
      label: "What could we improve or do better?",
      helpText: "Share any thoughts, critiques, or specific features you would like to see…",
      required: false,
      validation: {},
    },
  },

  // --- Choice & Selection ---
  {
    id: "preset-hear-about-us",
    title: "How did you hear about us?",
    category: "Choice & Selection",
    description: "Dropdown selector for acquisition and referral source",
    field: {
      type: "dropdown",
      label: "How did you hear about us?",
      required: false,
      options: [
        { id: "opt_google", label: "Google / Search Engine" },
        { id: "opt_social", label: "Social Media (Twitter/X, LinkedIn, Instagram)" },
        { id: "opt_referral", label: "Friend or Colleague recommendation" },
        { id: "opt_newsletter", label: "Blog or Newsletter" },
        { id: "opt_event", label: "Conference or Event" },
        { id: "opt_other", label: "Other" },
      ],
    },
  },
  {
    id: "preset-contact-method",
    title: "Preferred Contact Method",
    category: "Choice & Selection",
    description: "Single choice for how respondent prefers to be reached",
    field: {
      type: "multiple_choice",
      label: "What is your preferred way for us to contact you?",
      required: true,
      options: [
        { id: "opt_email", label: "Email" },
        { id: "opt_phone", label: "Phone call" },
        { id: "opt_sms", label: "Text / SMS" },
      ],
    },
  },
  {
    id: "preset-terms-agreement",
    title: "Terms & Conditions Agreement",
    category: "Choice & Selection",
    description: "Required single checkbox for legal / privacy policy acceptance",
    field: {
      type: "checkboxes",
      label: "Terms and Privacy",
      required: true,
      options: [
        {
          id: "opt_agree",
          label: "I have read and agree to the Terms of Service and Privacy Policy.",
        },
      ],
      validation: {},
    },
  },

  // --- Files & Media ---
  {
    id: "preset-resume",
    title: "Resume / CV Upload",
    category: "Files & Media",
    description: "Single PDF/Word document file upload for job applications",
    field: {
      type: "file_upload",
      label: "Upload your Resume / CV",
      helpText: "Accepted file formats: PDF, DOC, DOCX (up to 10 MB)",
      required: true,
      validation: {
        maxFiles: 1,
        maxSizeMb: 10,
        accept: ["application/pdf", ".doc", ".docx"],
      },
    },
  },
  {
    id: "preset-attachments",
    title: "Supporting Documents / Screenshots",
    category: "Files & Media",
    description: "Multi-file upload for images or PDF attachments",
    field: {
      type: "file_upload",
      label: "Supporting Screenshots or Documents",
      helpText: "Upload up to 5 files (Images, PDFs up to 15 MB total)",
      required: false,
      validation: {
        maxFiles: 5,
        maxSizeMb: 15,
        accept: ["image/*", "application/pdf"],
      },
    },
  },
];
