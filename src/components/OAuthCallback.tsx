import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { CheckCircle2, ShieldCheck, Loader2 } from "lucide-react";

interface OAuthCallbackProps {
  onSuccess?: () => void;
}

export const OAuthCallback: React.FC<OAuthCallbackProps> = ({ onSuccess }) => {
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const processAuth = async () => {
      try {
        if (!supabase) {
          throw new Error("Supabase is not configured.");
        }

        // Check if there is an error in URL params/hash
        const hash = window.location.hash;
        const search = window.location.search;
        const params = new URLSearchParams(search);

        if (hash.includes("error=") || params.has("error")) {
          const errorDesc = params.get("error_description") || "OAuth provider returned an error.";
          throw new Error(errorDesc);
        }

        // Get session after Supabase processes URL
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        setStatus("success");

        // Notify opener window if opened in popup
        if (window.opener && window.opener !== window) {
          try {
            window.opener.postMessage(
              {
                type: "SUPABASE_OAUTH_SUCCESS",
                session: session || null,
                user: session?.user || null,
              },
              "*"
            );
          } catch (e) {
            console.warn("Could not postMessage to opener:", e);
          }

          // Close popup after brief delay
          timeoutId = setTimeout(() => {
            try {
              window.close();
            } catch (e) {
              console.warn("Could not close popup window automatically:", e);
            }
          }, 800);
        } else if (onSuccess) {
          onSuccess();
        }
      } catch (err: any) {
        console.error("OAuth callback processing error:", err);
        setStatus("error");
        setErrorMessage(err.message || "Failed to finalize authentication.");
      }
    };

    // Give Supabase client a brief moment to extract tokens from URL
    const initTimer = setTimeout(processAuth, 200);

    // Also listen to onAuthStateChange as a backup
    let authSub: { unsubscribe: () => void } | null = null;
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_IN" || session) {
          setStatus("success");
          if (window.opener && window.opener !== window) {
            try {
              window.opener.postMessage(
                {
                  type: "SUPABASE_OAUTH_SUCCESS",
                  session,
                  user: session?.user || null,
                },
                "*"
              );
            } catch (e) {
              // ignore
            }
            setTimeout(() => {
              try {
                window.close();
              } catch (e) {}
            }, 600);
          }
        }
      });
      authSub = subscription;
    }

    return () => {
      clearTimeout(initTimer);
      clearTimeout(timeoutId);
      if (authSub) authSub.unsubscribe();
    };
  }, [onSuccess]);

  const handleManualClose = () => {
    try {
      window.close();
    } catch (e) {
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-screen bg-[#101010] text-[#eeeeee] flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm bg-[#181615] border border-[#2e2a28] rounded-[4px] p-6 text-center shadow-xl space-y-4">
        {status === "processing" && (
          <>
            <div className="w-12 h-12 rounded-full bg-[#ee6018]/10 border border-[#ee6018]/30 mx-auto flex items-center justify-center text-[#ee6018] animate-pulse">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-[#eeeeee]">Authorizing Operator</h2>
              <p className="text-xs text-[#8a8380] font-mono">
                Verifying Google OAuth tokens and establishing secure session...
              </p>
            </div>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-12 h-12 rounded-full bg-[#a0ca92]/10 border border-[#a0ca92]/30 mx-auto flex items-center justify-center text-[#a0ca92]">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-[#eeeeee]">Authentication Successful</h2>
              <p className="text-xs text-[#8a8380] font-mono">
                Session verified. Closing this authorization window...
              </p>
            </div>
            <button
              onClick={handleManualClose}
              className="w-full py-2 px-3 bg-[#252220] hover:bg-[#2e2a28] text-xs font-mono text-[#b8b3b0] rounded-[3px] border border-[#3d3a39] transition-all"
            >
              Close Window Now
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-12 h-12 rounded-full bg-[#e06c75]/10 border border-[#e06c75]/30 mx-auto flex items-center justify-center text-[#e06c75]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-[#e06c75]">Authorization Incomplete</h2>
              <p className="text-xs text-[#8a8380] font-mono">{errorMessage}</p>
            </div>
            <button
              onClick={handleManualClose}
              className="w-full py-2 px-3 bg-[#252220] hover:bg-[#2e2a28] text-xs font-mono text-[#b8b3b0] rounded-[3px] border border-[#3d3a39] transition-all"
            >
              Return to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
};
