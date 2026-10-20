-- FormIT Local Development Seed Script
-- Provides a test owner, sample forms covering all 8 field types, and sample responses.

do $$
declare
  v_user_id uuid := 'a0000000-0000-0000-0000-000000000001'::uuid;
  v_form1_id uuid := 'b0000000-0000-0000-0000-000000000001'::uuid;
  v_form2_id uuid := 'b0000000-0000-0000-0000-000000000002'::uuid;
  v_form3_id uuid := 'b0000000-0000-0000-0000-000000000003'::uuid;
begin
  -- 1. Create development user in auth.users if not present
  insert into auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at
  )
  values (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'dev@formit.local',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Local Developer"}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now()
  )
  on conflict (id) do nothing;

  -- 2. Form 1: Customer Satisfaction Survey (open, multi-section, conditional questions)
  insert into public.forms (
    id,
    owner_id,
    slug,
    title,
    schema,
    settings,
    status
  )
  values (
    v_form1_id,
    v_user_id,
    'customer-satisfaction-2026',
    'Product Feedback & Satisfaction Survey',
    jsonb_build_object(
      'title', 'Product Feedback & Satisfaction Survey',
      'description', 'We would love to hear your thoughts on FormIT and how we can improve.',
      'sections', jsonb_build_array(
        jsonb_build_object(
          'id', 's_about',
          'title', 'About You',
          'fields', jsonb_build_array(
            jsonb_build_object(
              'id', 'name',
              'type', 'short_text',
              'label', 'Your Name',
              'required', true,
              'validation', jsonb_build_object('minLen', 2, 'maxLen', 50)
            ),
            jsonb_build_object(
              'id', 'role',
              'type', 'dropdown',
              'label', 'What best describes your role?',
              'required', true,
              'options', jsonb_build_array(
                jsonb_build_object('id', 'eng', 'label', 'Engineer / Developer'),
                jsonb_build_object('id', 'pm', 'label', 'Product Manager'),
                jsonb_build_object('id', 'design', 'label', 'Designer'),
                jsonb_build_object('id', 'other', 'label', 'Other')
              )
            ),
            jsonb_build_object(
              'id', 'other_role',
              'type', 'short_text',
              'label', 'Please specify your role',
              'required', true,
              'visibleIf', jsonb_build_object('field', 'role', 'op', 'eq', 'value', 'other'),
              'validation', jsonb_build_object()
            )
          )
        ),
        jsonb_build_object(
          'id', 's_experience',
          'title', 'Product Experience',
          'fields', jsonb_build_array(
            jsonb_build_object(
              'id', 'rating',
              'type', 'linear_scale',
              'label', 'How would you rate your overall experience with FormIT?',
              'required', true,
              'validation', jsonb_build_object('min', 1, 'max', 5, 'minLabel', 'Poor', 'maxLabel', 'Excellent')
            ),
            jsonb_build_object(
              'id', 'features_liked',
              'type', 'checkboxes',
              'label', 'Which features do you value the most?',
              'required', false,
              'options', jsonb_build_array(
                jsonb_build_object('id', 'schema', 'label', 'JSON Schema Versioning'),
                jsonb_build_object('id', 'logic', 'label', 'Conditional Logic Engine'),
                jsonb_build_object('id', 'performance', 'label', 'Sub-second Page Speeds'),
                jsonb_build_object('id', 'privacy', 'label', 'Supabase Data Isolation')
              )
            ),
            jsonb_build_object(
              'id', 'improvements',
              'type', 'long_text',
              'label', 'What could we do better?',
              'required', false,
              'validation', jsonb_build_object('maxLen', 1000)
            )
          )
        )
      )
    ),
    jsonb_build_object(
      'requireSignIn', false,
      'oneResponsePerUser', false,
      'confirmationMessage', 'Thank you for your valuable feedback!'
    ),
    'open'
  )
  on conflict (id) do nothing;

  -- 3. Form 2: Career Application (file upload, date, sign-in required)
  insert into public.forms (
    id,
    owner_id,
    slug,
    title,
    schema,
    settings,
    status
  )
  values (
    v_form2_id,
    v_user_id,
    'senior-engineer-application',
    'Senior Frontend Engineer Application',
    jsonb_build_object(
      'title', 'Senior Frontend Engineer Application',
      'description', 'Join our engineering team building next-generation web tooling.',
      'sections', jsonb_build_array(
        jsonb_build_object(
          'id', 's_candidate',
          'title', 'Candidate Details',
          'fields', jsonb_build_array(
            jsonb_build_object(
              'id', 'full_name',
              'type', 'short_text',
              'label', 'Full Name',
              'required', true,
              'validation', jsonb_build_object('minLen', 2)
            ),
            jsonb_build_object(
              'id', 'earliest_start',
              'type', 'date',
              'label', 'Earliest Available Start Date',
              'required', true,
              'validation', jsonb_build_object()
            ),
            jsonb_build_object(
              'id', 'resume',
              'type', 'file_upload',
              'label', 'Upload Resume / CV (PDF or Word)',
              'required', true,
              'validation', jsonb_build_object('maxSizeMb', 10, 'accept', jsonb_build_array('application/pdf', 'application/msword'))
            )
          )
        )
      )
    ),
    jsonb_build_object(
      'requireSignIn', true,
      'oneResponsePerUser', true,
      'confirmationMessage', 'Application received. We will contact you soon.'
    ),
    'open'
  )
  on conflict (id) do nothing;

  -- 4. Sample response for Customer Satisfaction Survey
  insert into public.responses (
    form_id,
    schema_version,
    answers,
    submitted_at
  )
  values (
    v_form1_id,
    1,
    jsonb_build_object(
      'name', 'Alex Mercer',
      'role', 'eng',
      'rating', 5,
      'features_liked', jsonb_build_array('schema', 'logic'),
      'improvements', 'Excited for the visual drag-and-drop builder!'
    ),
    now() - interval '2 hours'
  )
  on conflict do nothing;

end $$;
