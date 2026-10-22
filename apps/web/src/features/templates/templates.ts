import { newId, parseFormSchema, type FormSchema } from "@formit/schema";
import {
  Briefcase,
  CalendarCheck,
  CalendarDays,
  Mail,
  MessageSquareHeart,
  type LucideIcon,
} from "lucide-react";

export type FormTemplate = {
  id: string;
  title: string;
  category: string;
  description: string;
  icon: LucideIcon;
  color: string;
  createSchema: () => FormSchema;
};

/**
 * Creates the Contact Us template with Name, Email, Subject, and Message.
 */
function createContactTemplate(): FormSchema {
  const sectionId = newId("s");
  const nameId = newId("f");
  const emailId = newId("f");
  const subjectId = newId("f");
  const messageId = newId("f");

  return {
    title: "Contact Us",
    description: "We'd love to hear from you. Send us a message and we'll respond as soon as possible.",
    sections: [
      {
        id: sectionId,
        title: "Contact Details",
        fields: [
          {
            id: nameId,
            type: "short_text",
            label: "Your Full Name",
            required: true,
            validation: { maxLength: 100 },
          },
          {
            id: emailId,
            type: "short_text",
            label: "Email Address",
            helpText: "We will never share your email with third parties.",
            required: true,
            validation: { format: "email" },
          },
          {
            id: subjectId,
            type: "dropdown",
            label: "What is this inquiry regarding?",
            required: true,
            options: [
              { id: newId("opt"), label: "General Questions" },
              { id: newId("opt"), label: "Customer Support" },
              { id: newId("opt"), label: "Sales & Inquiries" },
              { id: newId("opt"), label: "Partnership Opportunities" },
              { id: newId("opt"), label: "Feedback & Suggestions" },
            ],
          },
          {
            id: messageId,
            type: "long_text",
            label: "Your Message",
            helpText: "Please provide as much context as possible.",
            required: true,
            validation: { minLength: 10, maxLength: 2000 },
          },
        ],
      },
    ],
  };
}

/**
 * Creates Customer Feedback template with rating, highlights, improvements, and recommendation.
 */
function createFeedbackTemplate(): FormSchema {
  const sectionId = newId("s");
  const ratingId = newId("f");
  const highlightsId = newId("f");
  const improvementsId = newId("f");
  const recommendId = newId("f");

  return {
    title: "Customer Feedback Survey",
    description: "Help us improve by sharing your thoughts and recent experience with our product.",
    sections: [
      {
        id: sectionId,
        title: "Your Experience",
        fields: [
          {
            id: ratingId,
            type: "linear_scale",
            label: "Overall, how satisfied are you with our service?",
            required: true,
            min: 1,
            max: 5,
            labels: { min: "Very Dissatisfied", max: "Delighted" },
          },
          {
            id: highlightsId,
            type: "checkboxes",
            label: "What features or aspects did you find most valuable?",
            required: false,
            options: [
              { id: newId("opt"), label: "Speed & Performance" },
              { id: newId("opt"), label: "Ease of Use & Keyboard Navigation" },
              { id: newId("opt"), label: "Clean Visual Design" },
              { id: newId("opt"), label: "Responsive Customer Support" },
              { id: newId("opt"), label: "Reliability & Uptime" },
            ],
            validation: { minSelected: 1 },
          },
          {
            id: improvementsId,
            type: "long_text",
            label: "What is one thing we could improve or build next?",
            helpText: "Tell us about any roadblocks or feature requests.",
            required: false,
            validation: { maxLength: 1000 },
          },
          {
            id: recommendId,
            type: "multiple_choice",
            label: "How likely are you to recommend us to a colleague?",
            required: true,
            options: [
              { id: newId("opt"), label: "Extremely likely (Promoter)" },
              { id: newId("opt"), label: "Somewhat likely (Passive)" },
              { id: newId("opt"), label: "Neutral" },
              { id: newId("opt"), label: "Unlikely (Detractor)" },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * Creates Event RSVP template with attendance confirmation, guest count, and dietary options.
 */
function createRsvpTemplate(): FormSchema {
  const sectionId = newId("s");
  const attendId = newId("f");
  const optYes = newId("opt");
  const optNo = newId("opt");
  const optMaybe = newId("opt");
  const guestsId = newId("f");
  const dietaryId = newId("f");
  const notesId = newId("f");

  return {
    title: "Event RSVP",
    description: "Please confirm your attendance so we can organize seating and catering.",
    sections: [
      {
        id: sectionId,
        title: "RSVP & Preferences",
        fields: [
          {
            id: attendId,
            type: "multiple_choice",
            label: "Will you be joining us for the event?",
            required: true,
            options: [
              { id: optYes, label: "Yes, I'll be there!" },
              { id: optNo, label: "Regretfully, I cannot make it" },
              { id: optMaybe, label: "Tentative / Not sure yet" },
            ],
          },
          {
            id: guestsId,
            type: "short_text",
            label: "How many guests will be in your party (including yourself)?",
            required: true,
            visibleIf: { field: attendId, op: "eq", value: optYes },
            validation: { format: "number" },
          },
          {
            id: dietaryId,
            type: "checkboxes",
            label: "Do you or any of your guests have dietary requirements?",
            required: false,
            visibleIf: { field: attendId, op: "eq", value: optYes },
            validation: {},
            options: [
              { id: newId("opt"), label: "None / Standard catering" },
              { id: newId("opt"), label: "Vegetarian" },
              { id: newId("opt"), label: "Vegan" },
              { id: newId("opt"), label: "Gluten-Free" },
              { id: newId("opt"), label: "Halal" },
              { id: newId("opt"), label: "Kosher" },
              { id: newId("opt"), label: "Nut Allergy" },
            ],
          },
          {
            id: notesId,
            type: "long_text",
            label: "Any special notes or song requests for the evening?",
            required: false,
            validation: { maxLength: 500 },
          },
        ],
      },
    ],
  };
}

/**
 * Creates Job Application template with candidate details, role choice, resume upload, and experience.
 */
function createJobApplicationTemplate(): FormSchema {
  const sectionId = newId("s");
  const nameId = newId("f");
  const emailId = newId("f");
  const phoneId = newId("f");
  const roleId = newId("f");
  const portfolioId = newId("f");
  const resumeId = newId("f");
  const expId = newId("f");
  const coverId = newId("f");

  return {
    title: "Job Application",
    description: "Join our fast-growing team. Please share your background, experience, and resume.",
    sections: [
      {
        id: sectionId,
        title: "Candidate Information",
        fields: [
          {
            id: nameId,
            type: "short_text",
            label: "Full Name",
            required: true,
            validation: { maxLength: 100 },
          },
          {
            id: emailId,
            type: "short_text",
            label: "Email Address",
            required: true,
            validation: { format: "email" },
          },
          {
            id: phoneId,
            type: "short_text",
            label: "Phone Number",
            helpText: "Include country code if applicable.",
            required: false,
            validation: {},
          },
          {
            id: roleId,
            type: "dropdown",
            label: "Which position are you applying for?",
            required: true,
            options: [
              { id: newId("opt"), label: "Frontend Engineer (React / TypeScript)" },
              { id: newId("opt"), label: "Backend Engineer (Distributed Systems)" },
              { id: newId("opt"), label: "Product Designer (UI/UX)" },
              { id: newId("opt"), label: "Engineering Manager" },
              { id: newId("opt"), label: "Developer Advocate" },
            ],
          },
          {
            id: portfolioId,
            type: "short_text",
            label: "GitHub, LinkedIn, or Portfolio Link",
            required: false,
            validation: { format: "url" },
          },
          {
            id: resumeId,
            type: "file_upload",
            label: "Upload your Resume / CV",
            helpText: "Accepted formats: PDF or DOCX (up to 10 MB)",
            required: true,
            validation: {
              maxFiles: 1,
              maxSizeMb: 10,
              accept: [
                "application/pdf",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              ],
            },
          },
          {
            id: expId,
            type: "linear_scale",
            label: "Years of relevant industry experience",
            required: true,
            min: 0,
            max: 10,
            labels: { min: "0 yrs", max: "10+ yrs" },
          },
          {
            id: coverId,
            type: "long_text",
            label: "Why would you be a great fit for this role?",
            helpText: "Highlight relevant projects or key achievements.",
            required: false,
            validation: { maxLength: 1500 },
          },
        ],
      },
    ],
  };
}

/**
 * Creates Event Registration template with ticket tiers, workshops, and t-shirt sizes.
 */
function createEventRegistrationTemplate(): FormSchema {
  const sectionId = newId("s");
  const nameId = newId("f");
  const emailId = newId("f");
  const ticketId = newId("f");
  const workshopsId = newId("f");
  const tshirtId = newId("f");
  const accommodationsId = newId("f");

  return {
    title: "Event Registration",
    description: "Register for the upcoming summit, choose your pass, and customize your workshop schedule.",
    sections: [
      {
        id: sectionId,
        title: "Registration Details",
        fields: [
          {
            id: nameId,
            type: "short_text",
            label: "Attendee Full Name",
            required: true,
            validation: { maxLength: 100 },
          },
          {
            id: emailId,
            type: "short_text",
            label: "Work / Organization Email",
            required: true,
            validation: { format: "email" },
          },
          {
            id: ticketId,
            type: "multiple_choice",
            label: "Select your Pass Tier",
            required: true,
            options: [
              { id: newId("opt"), label: "General Admission Pass" },
              { id: newId("opt"), label: "All-Access VIP Pass (Keynotes + Workshops)" },
              { id: newId("opt"), label: "Student & Educator Discount Pass" },
              { id: newId("opt"), label: "Speaker / Sponsor Pass" },
            ],
          },
          {
            id: workshopsId,
            type: "checkboxes",
            label: "Which breakout workshops do you plan to join?",
            required: false,
            validation: {},
            options: [
              { id: newId("opt"), label: "Building High-Conversion Form Engines" },
              { id: newId("opt"), label: "Modern Frontend Architecture & State Machines" },
              { id: newId("opt"), label: "PostgreSQL Row-Level Security Masterclass" },
              { id: newId("opt"), label: "Edge Functions & Realtime Data Streams" },
            ],
          },
          {
            id: tshirtId,
            type: "dropdown",
            label: "Attendee Swag: T-Shirt Size",
            required: true,
            options: [
              { id: newId("opt"), label: "Unisex XS" },
              { id: newId("opt"), label: "Unisex S" },
              { id: newId("opt"), label: "Unisex M" },
              { id: newId("opt"), label: "Unisex L" },
              { id: newId("opt"), label: "Unisex XL" },
              { id: newId("opt"), label: "Unisex 2XL" },
            ],
          },
          {
            id: accommodationsId,
            type: "long_text",
            label: "Accessibility or special accommodations",
            helpText: "Let us know if you require wheelchair access, audio assistance, or other support.",
            required: false,
            validation: { maxLength: 500 },
          },
        ],
      },
    ],
  };
}

export const FORM_TEMPLATES: FormTemplate[] = [
  {
    id: "contact",
    title: "Contact Us",
    category: "General & Support",
    description: "Capture messages, support requests, and partner inquiries with validated email contact fields.",
    icon: Mail,
    color: "from-sky-500 to-indigo-600",
    createSchema: createContactTemplate,
  },
  {
    id: "feedback",
    title: "Customer Feedback",
    category: "Product & Experience",
    description: "Gauge customer satisfaction, collect feature requests, and uncover NPS promoters.",
    icon: MessageSquareHeart,
    color: "from-violet-500 to-purple-600",
    createSchema: createFeedbackTemplate,
  },
  {
    id: "rsvp",
    title: "Event RSVP",
    category: "Events & Meetups",
    description: "Manage attendance with conditional guest counts and dietary preference checkboxes.",
    icon: CalendarCheck,
    color: "from-emerald-500 to-teal-600",
    createSchema: createRsvpTemplate,
  },
  {
    id: "job_application",
    title: "Job Application",
    category: "HR & Recruiting",
    description: "Collect candidate profiles, portfolio links, experience ratings, and resume file uploads.",
    icon: Briefcase,
    color: "from-amber-500 to-orange-600",
    createSchema: createJobApplicationTemplate,
  },
  {
    id: "event_registration",
    title: "Event Registration",
    category: "Conferences & Summits",
    description: "Handle conference attendee sign-ups, ticket tier selection, workshops, and swag sizes.",
    icon: CalendarDays,
    color: "from-indigo-500 to-violet-600",
    createSchema: createEventRegistrationTemplate,
  },
];

/**
 * Instantiates a template with brand-new IDs and validates the schema.
 */
export function instantiateTemplate(template: FormTemplate): FormSchema {
  const schema = template.createSchema();
  const parsed = parseFormSchema(schema);
  if (!parsed.success) {
    const errorMsg = parsed.issues.map((i) => i.message).join(", ");
    throw new Error(`Failed to instantiate template "${template.title}": ${errorMsg}`);
  }
  return parsed.data;
}
