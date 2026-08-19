import React, { useState } from "react";
import { COMMERCIAL_LAYERS, type CommercialLayer } from "@/lib/commercialLayers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Layers, ShieldCheck, Zap, Send } from "lucide-react";
import { toast } from "sonner";

export function CleanCommercialLayersModal() {
  const [open, setOpen] = useState(false);
  const [upgradeLayer, setUpgradeLayer] = useState<CommercialLayer | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [notes, setNotes] = useState("");

  const handleUpgradeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName || !contactEmail) {
      toast.error("Please provide your name and work email.");
      return;
    }
    toast.success(`Upgrade request for "${upgradeLayer?.title}" submitted successfully! Our transformation leadership will contact you at ${contactEmail}.`);
    setUpgradeLayer(null);
    setContactName("");
    setContactEmail("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-[#876e16]/30 bg-[#fcfbf7] text-[#173d2a] hover:bg-[#876e16]/10">
          <Layers className="h-4 w-4 text-[#876e16]" />
          <span>Commercial Tiers</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl bg-[#fcfbf7] border-[#173d2a]/20 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif text-[#173d2a] flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-[#876e16]" />
            John Deere Idea Value Studio — Commercial Tiers
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Structured commercial models designed to help John Deere transition from traditional hackathons to a governed, evidence-first enterprise transformation pipeline.
          </p>
        </DialogHeader>

        {upgradeLayer ? (
          <div className="bg-white p-6 rounded-lg border border-[#173d2a]/15 shadow-sm mt-4 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-serif text-lg text-[#173d2a]">Request Upgrade: {upgradeLayer.title}</h3>
              <Button variant="ghost" size="sm" onClick={() => setUpgradeLayer(null)}>Back to Tiers</Button>
            </div>
            <p className="text-xs text-muted-foreground">{upgradeLayer.tagline}. Fill out your details below to initiate enterprise provisioning.</p>
            <form onSubmit={handleUpgradeSubmit} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground">Your Name</label>
                  <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="e.g. Douglas Smith" required className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Work Email</label>
                  <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="e.g. smithdo@johndeere.com" required className="mt-1" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">Transformation Objectives & Scope Notes</label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Describe expected user volume, target domains, or specific integration requirements..." className="mt-1 h-24" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setUpgradeLayer(null)}>Cancel</Button>
                <Button type="submit" size="sm" className="bg-[#173d2a] text-white hover:bg-[#173d2a]/90 gap-1.5">
                  <Send className="h-3.5 w-3.5" />
                  Submit Upgrade Request
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {COMMERCIAL_LAYERS.map((layer) => (
              <Card key={layer.id} className="border-[#173d2a]/15 bg-white shadow-sm flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="w-8 h-8 rounded-full bg-[#173d2a]/10 flex items-center justify-center text-[#173d2a] font-bold mb-2">
                    {layer.id === "pilot" ? "1" : layer.id === "subscription" ? "2" : "3"}
                  </div>
                  <CardTitle className="text-lg font-serif text-[#173d2a]">{layer.title}</CardTitle>
                  <p className="text-xs text-[#876e16] font-medium mt-1">{layer.tagline}</p>
                </CardHeader>
                <CardContent className="space-y-4 text-xs flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div>
                      <span className="font-semibold text-foreground">Scope:</span>
                      <p className="text-muted-foreground mt-0.5">{layer.scope}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">Key Deliverables:</span>
                      <ul className="mt-1 space-y-1">
                        {layer.deliverables.map((d, i) => (
                          <li key={i} className="flex items-start gap-1 text-muted-foreground">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">Client Outcomes:</span>
                      <ul className="mt-1 space-y-1">
                        {layer.clientOutcomes.map((o, i) => (
                          <li key={i} className="flex items-start gap-1 text-muted-foreground">
                            <Zap className="h-3.5 w-3.5 text-[#876e16] shrink-0 mt-0.5" />
                            <span>{o}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-4 border-t mt-4">
                    {layer.id === "pilot" ? (
                      <Button variant="outline" size="sm" className="w-full text-xs" disabled>
                        Active Tier
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => setUpgradeLayer(layer)} className="w-full text-xs bg-[#173d2a] text-white hover:bg-[#173d2a]/90">
                        Request Upgrade
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
