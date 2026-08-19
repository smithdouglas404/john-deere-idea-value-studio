import { useRef, useState } from "react";
import { FileText, Loader2, ShieldCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

const allowedTypes = ["text/plain", "text/markdown", "text/csv", "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

function readAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("This document could not be read."));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
}

export function ProjectDocumentEvidencePanel({ projectId }: { projectId: number }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();
  const [file, setFile] = useState<File | null>(null);
  const { data: documents, isLoading } = trpc.hackathons.projectDocuments.useQuery({ projectId });
  const upload = trpc.hackathons.uploadProjectDocument.useMutation({ onSuccess: () => { setFile(null); if (inputRef.current) inputRef.current.value = ""; utils.hackathons.projectDocuments.invalidate({ projectId }); } });
  const submit = async () => {
    if (!file) return;
    try { upload.mutate({ projectId, fileName: file.name, mimeType: file.type || "text/plain", base64: await readAsBase64(file), consent: true }); }
    catch (error) { /* mutation surfaces a readable error */ }
  };
  return <section className="mt-6 border border-[#c6d4c2] bg-[#f4f7ef] p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-[#1b5e3a]"><FileText className="h-4 w-4" /><p className="text-[10px] font-bold uppercase tracking-[.14em]">Deep evaluation documents</p></div><h2 className="mt-2 font-serif text-[24px] text-[#1b3829]">Add the BRD or technical proof behind the build.</h2><p className="mt-2 max-w-2xl text-[11px] leading-5 text-[#536254]">Upload a consented BRD, architecture note, API specification, or technical document. Claude skills use the extracted content alongside code, proof evidence, and cited market research; files are not treated as proof without the human review that follows.</p></div><span className="border border-[#c5d6c1] bg-white px-3 py-2 text-[9px] font-bold uppercase tracking-[.1em] text-[#1b5e3a]"><ShieldCheck className="mr-1 inline h-3.5 w-3.5" />Consent recorded</span></div><div className="mt-5 grid gap-4 xl:grid-cols-[.85fr_1.15fr]"><div className="border border-dashed border-[#b9cdb7] bg-white p-4"><input ref={inputRef} type="file" accept=".txt,.md,.csv,.pdf,.docx,text/plain,text/markdown,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" onChange={event => { const selected = event.target.files?.[0] || null; setFile(selected && allowedTypes.includes(selected.type || "text/plain") ? selected : null); }} /><Button type="button" variant="outline" onClick={() => inputRef.current?.click()} className="h-9 rounded-none border-[#1b5e3a] text-[9px] font-bold uppercase tracking-[.1em] text-[#1b5e3a]"><Upload className="mr-1.5 h-3.5 w-3.5" />Choose document</Button>{file ? <p className="mt-3 text-[11px] font-semibold text-[#1b3829]">{file.name} · {(file.size / 1024).toFixed(1)} KB</p> : <p className="mt-3 text-[10px] leading-4 text-[#758077]">TXT, Markdown, CSV, PDF, or DOCX · maximum 8 MB</p>}<Button disabled={!file || upload.isPending} onClick={submit} className="mt-4 h-9 rounded-none bg-[#173d2a] text-[9px] font-bold uppercase tracking-[.1em]"><Upload className="mr-1.5 h-3.5 w-3.5" />{upload.isPending ? "Extracting…" : "Add to evaluation packet"}</Button>{upload.error && <p className="mt-3 text-[10px] leading-4 text-red-700">{upload.error.message}</p>}</div><div className="border border-[#c9d6c6] bg-white p-4"><p className="text-[9px] font-bold uppercase tracking-[.12em] text-[#758077]">Authorized evaluation sources</p>{isLoading ? <div className="mt-4 flex items-center gap-2 text-[11px] text-[#758077]"><Loader2 className="h-4 w-4 animate-spin" />Loading documents…</div> : documents?.length ? <div className="mt-4 space-y-3">{documents.map(document => <div key={document.id} className="border-l-2 border-[#1b5e3a] pl-3"><p className="text-[11px] font-semibold text-[#1b3829]">{document.originalName}</p><p className="mt-1 text-[9px] uppercase tracking-[.08em] text-[#758077]">{document.mimeType} · {(document.byteSize / 1024).toFixed(1)} KB · {String((document.extraction as any)?.method || "source retained")}</p></div>)}</div> : <p className="mt-4 text-[11px] leading-5 text-[#758077]">No BRD or technical document has been added to this project’s evaluation packet yet.</p>}</div></div></section>;
}
