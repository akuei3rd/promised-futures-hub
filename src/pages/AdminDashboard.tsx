import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, LogOut, FileText, MessageSquare, Bell, Trash2, Check, X, Plus, Send, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("applications");
  const [newAnnouncement, setNewAnnouncement] = useState({ title: "", content: "" });
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/admin/login");
    });
  }, [navigate]);

  const { data: applications, error: appError } = useQuery({
    queryKey: ["admin-applications"],
    queryFn: async () => {
      const { data, error } = await supabase.from("applications").select("*, programs(name)").order("created_at", { ascending: false });
      if (error) {
        console.error("Applications error:", error);
        throw error;
      }
      return data;
    },
  });

  const { data: messages, error: msgError } = useQuery({
    queryKey: ["admin-messages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contact_messages").select("*").order("created_at", { ascending: false });
      if (error) {
        console.error("Messages error:", error);
        throw error;
      }
      return data;
    },
  });

  const { data: announcements, error: annError } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: async () => {
      const { data, error } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
      if (error) {
        console.error("Announcements error:", error);
        throw error;
      }
      return data;
    },
  });

  const updateApplicationStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "pending" | "approved" | "rejected" }) => {
      const { error } = await supabase.from("applications").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-applications"] });
      toast({ title: "Status updated" });
    },
  });

  const deleteApplication = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("applications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-applications"] }),
  });

  const createAnnouncement = useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
      const { error } = await supabase.from("announcements").insert([data]);
      if (error) {
        console.error("Create announcement error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      setNewAnnouncement({ title: "", content: "" });
      toast({ title: "Announcement posted successfully!" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to post announcement", description: error.message, variant: "destructive" });
    },
  });

  const deleteAnnouncement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-announcements"] }),
  });

  const replyToMessage = useMutation({
    mutationFn: async ({ id, reply }: { id: string; reply: string }) => {
      const { error } = await supabase.from("contact_messages").update({ admin_reply: reply, replied_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-messages"] });
      setReplyingTo(null);
      setReplyText("");
      toast({ title: "Reply sent" });
    },
  });

  const deleteMessage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contact_messages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-messages"] }),
  });

  const toggleExpandMessage = (id: string) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  const tabs = [
    { id: "applications", label: "Applications", icon: FileText, count: applications?.length },
    { id: "messages", label: "Messages", icon: MessageSquare, count: messages?.length },
    { id: "announcements", label: "Announcements", icon: Bell, count: announcements?.length },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-slate-800 text-amber-50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-amber-400" />
            <span className="font-serif text-xl font-bold">Admin Dashboard</span>
          </div>
          <Button variant="ghost" onClick={handleLogout} className="text-amber-50 hover:text-amber-400">
            <LogOut className="h-5 w-5 mr-2" /> Logout
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === tab.id ? "bg-amber-400 text-slate-900" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >
              <tab.icon className="h-5 w-5" />
              {tab.label}
              {tab.count !== undefined && <span className="px-2 py-0.5 rounded-full bg-slate-900/20 text-xs">{tab.count}</span>}
            </button>
          ))}
        </div>

        {/* Applications Tab */}
        {activeTab === "applications" && (
          <div className="space-y-4">
            {applications?.length === 0 && <p className="text-muted-foreground text-center py-8">No applications yet.</p>}
            {applications?.map((app: any) => (
              <div key={app.id} className="bg-card rounded-xl p-6 border border-border">
                <div className="flex flex-wrap justify-between items-start gap-4">
                  <div>
                    <h3 className="font-semibold text-lg text-foreground">{app.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{app.email} • {app.phone}</p>
                    <p className="text-sm text-muted-foreground mt-1">Program: <span className="font-medium">{app.programs?.name}</span></p>
                    <p className="text-xs text-muted-foreground mt-2">Applied: {format(new Date(app.created_at), "MMM d, yyyy")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${app.status === "approved" ? "bg-green-100 text-green-800" : app.status === "rejected" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
                      {app.status}
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => updateApplicationStatus.mutate({ id: app.id, status: "approved" })}><Check className="h-4 w-4 text-green-600" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => updateApplicationStatus.mutate({ id: app.id, status: "rejected" })}><X className="h-4 w-4 text-red-600" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteApplication.mutate(app.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === "messages" && (
          <div className="space-y-4">
            {messages?.length === 0 && <p className="text-muted-foreground text-center py-8">No messages yet.</p>}
            {messages?.map((msg: any) => (
              <div key={msg.id} className="bg-card rounded-xl p-6 border border-border">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{msg.subject}</h3>
                      {msg.admin_reply && <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs">Replied</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">{msg.name} • {msg.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{format(new Date(msg.created_at), "MMM d, yyyy")}</span>
                    <Button size="sm" variant="ghost" onClick={() => toggleExpandMessage(msg.id)}>
                      {expandedMessages.has(msg.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteMessage.mutate(msg.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                <p className="mt-4 text-foreground">{msg.message}</p>
                
                {expandedMessages.has(msg.id) && (
                  <div className="mt-4 pt-4 border-t border-border">
                    {msg.admin_reply ? (
                      <div className="bg-muted/50 rounded-lg p-4">
                        <p className="text-xs text-muted-foreground mb-2">Your reply • {msg.replied_at && format(new Date(msg.replied_at), "MMM d, yyyy")}</p>
                        <p className="text-foreground">{msg.admin_reply}</p>
                      </div>
                    ) : replyingTo === msg.id ? (
                      <div className="space-y-3">
                        <Textarea 
                          placeholder="Type your reply..." 
                          value={replyText} 
                          onChange={(e) => setReplyText(e.target.value)}
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" variant="gold" onClick={() => replyToMessage.mutate({ id: msg.id, reply: replyText })} disabled={!replyText.trim()}>
                            <Send className="h-4 w-4 mr-2" /> Send Reply
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setReplyingTo(null); setReplyText(""); }}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setReplyingTo(msg.id)}>
                        <Send className="h-4 w-4 mr-2" /> Reply to this message
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Announcements Tab */}
        {activeTab === "announcements" && (
          <div className="space-y-6">
            <div className="bg-card rounded-xl p-6 border border-border">
              <h3 className="font-semibold text-foreground mb-4">Post New Announcement</h3>
              <div className="space-y-4">
                <Input placeholder="Title" value={newAnnouncement.title} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })} />
                <Textarea placeholder="Content" rows={3} value={newAnnouncement.content} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })} />
                <Button variant="gold" onClick={() => createAnnouncement.mutate(newAnnouncement)} disabled={!newAnnouncement.title || !newAnnouncement.content}>
                  <Plus className="h-4 w-4 mr-2" /> Post Announcement
                </Button>
              </div>
            </div>
            {announcements?.map((ann: any) => (
              <div key={ann.id} className="bg-card rounded-xl p-6 border border-border">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-foreground">{ann.title}</h3>
                    <span className="text-xs text-muted-foreground">{format(new Date(ann.created_at), "MMM d, yyyy")}</span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => deleteAnnouncement.mutate(ann.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
                <p className="mt-2 text-muted-foreground">{ann.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
