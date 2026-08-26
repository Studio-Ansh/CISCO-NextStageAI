import { createClient, SupabaseClient, User, Session } from "@supabase/supabase-js";

// Supabase Configuration
const supabaseUrl =
  (import.meta as any).env?.VITE_SUPABASE_URL || "https://xkbnpeyuzyxchcxumhfy.supabase.co";
const supabaseAnonKey =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrYm5wZXl1enl4Y2hjeHVtaGZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3MTY1NTYsImV4cCI6MjEwMzI5MjU1Nn0.7pDGgeo2xEiDRF3_KSkD5sfZFw6fW7iPk8z5_P6ntF0";


// Check if valid Supabase configuration is present
export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== "https://your-project.supabase.co" &&
    supabaseAnonKey !== "your-anon-key" &&
    supabaseUrl.startsWith("http")
  );
};

// Initialize Supabase client
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

// Authentication Helper Functions
export async function signInWithEmail(email: string, password: string) {
  if (!supabase) {
    throw new Error("Supabase is not configured. Please provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email: string, password: string, displayName?: string) {
  if (!supabase) {
    throw new Error("Supabase is not configured. Please provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: displayName || email.split("@")[0],
      },
    },
  });
  if (error) throw error;
  return data;
}

export async function signOutUser() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function signInWithGoogle() {
  if (!supabase) {
    throw new Error("Supabase is not configured. Please check your credentials.");
  }
  const redirectUrl = window.location.origin;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;
  
  if (data?.url) {
    // Open centered popup window
    const width = 540;
    const height = 650;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const authWindow = window.open(
      data.url,
      "google_oauth_popup",
      `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no,location=yes,resizable=yes`
    );

    if (!authWindow || authWindow.closed || typeof authWindow.closed === "undefined") {
      // If popup was blocked by browser, navigate in top window
      window.location.href = data.url;
    } else {
      authWindow.focus?.();
    }
  }
  return data;
}

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}
