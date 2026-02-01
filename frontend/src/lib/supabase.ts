import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gbpikobqekehakzibazn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdicGlrb2JxZWtlaGFremliYXpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NTQ0NDQsImV4cCI6MjA4NTMzMDQ0NH0.kqdNglDrh3v_Br37ZA-uK4Q6gwEMv66UEEqqLdwQA_8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
