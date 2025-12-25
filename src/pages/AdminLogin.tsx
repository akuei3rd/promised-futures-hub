import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Loader2 } from "lucide-react";

const ALLOWED_ADMIN_EMAIL = "jokabrahamthon@promisedlandss.org";

const AdminLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        navigate("/admin/dashboard");
      }
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/admin/reset-password`,
        });
        if (error) throw error;
        toast({ title: "Email Sent!", description: "Check your inbox for a password reset link." });
        setMode("login");
      } else if (mode === "signup") {
        if (email.toLowerCase() !== ALLOWED_ADMIN_EMAIL.toLowerCase()) {
          toast({ title: "Error", description: "Only the designated admin email can sign up.", variant: "destructive" });
          setLoading(false);
          return;
        }
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        if (data.user) {
          await supabase.from("user_roles").insert({ user_id: data.user.id, role: "admin" });
          toast({ title: "Account Created!", description: "You can now log in." });
          setMode("login");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/admin/dashboard");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-800 to-slate-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-2xl p-8 shadow-xl">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-300 mb-4">
            <GraduationCap className="h-8 w-8 text-slate-900" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Admin Portal</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {mode === "login" ? "Sign in to your account" : mode === "signup" ? "Create admin account" : "Reset your password"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {mode !== "forgot" && (
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          )}
          <Button type="submit" variant="gold" size="lg" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "login" ? "Sign In" : mode === "signup" ? "Sign Up" : "Send Reset Link"}
          </Button>
        </form>

        {mode === "login" && (
          <button onClick={() => setMode("forgot")} className="block w-full text-center text-sm text-muted-foreground mt-4 hover:text-amber-600">
            Forgot Password?
          </button>
        )}

        <p className="text-center text-sm text-muted-foreground mt-4">
          {mode === "login" ? "Need an admin account?" : "Already have an account?"}{" "}
          <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="text-amber-600 hover:underline font-medium">
            {mode === "login" ? "Sign Up" : "Sign In"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
