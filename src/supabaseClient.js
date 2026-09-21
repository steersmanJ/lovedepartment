import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://otygxockbycmgfkvasjb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90eWd4b2NrYnljbWdma3Zhc2piIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5NzA1NzUsImV4cCI6MjEwNTU0NjU3NX0.ubS5I83qZUwnz6C60e4xXAPloPVuGSMOOKRe3uKhhiw'

export const supabase = createClient(supabaseUrl, supabaseKey)
