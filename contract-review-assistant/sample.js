// Fictional sample contract and canned AI output (demo mode). Not a real client or agreement.
var SAMPLE_CONTRACT = [
"1. Parties and Services",
"This Software Services Agreement is made between Northbridge Analytics Inc. (\"Supplier\") and Maple Ridge Dental Group Ltd. (\"Client\"). Supplier will provide hosted scheduling software and related support services described in Schedule A.",
"",
"2. Term and Renewal",
"The initial term is twelve (12) months from the Effective Date. This Agreement will automatically renew for successive one-year terms unless either party gives written notice of non-renewal at least thirty (30) days before the end of the then-current term.",
"",
"3. Fees and Payment",
"Client shall pay all invoices within forty-five (45) days of receipt of each invoice. Late amounts bear interest at 1.5% per month. Supplier may increase fees once per year with thirty (30) days notice.",
"",
"4. Client Data",
"Client retains ownership of Client Data. Supplier may use Client Data in aggregated form to improve its services and develop new products.",
"",
"5. Confidentiality",
"Each party shall keep the other party's Confidential Information confidential during the term and for two (2) years after termination of this Agreement.",
"",
"6. Limitation of Liability",
"Except for breach of confidentiality, Supplier's total liability under this Agreement shall not exceed the fees paid by Client in the three (3) months before the claim arose.",
"",
"7. Indemnification",
"Client shall indemnify, defend and hold harmless Supplier from any third-party claims arising from Client's use of the services.",
"",
"8. Termination",
"Either party may terminate for material breach not cured within thirty (30) days of notice. Supplier may terminate this Agreement for convenience on sixty (60) days written notice.",
"",
"9. Assignment",
"Supplier may assign this Agreement to an affiliate or successor without the consent of Client.",
"",
"10. Governing Law",
"This Agreement is governed by the laws of the Province of British Columbia and the federal laws of Canada applicable there."
].join("\n");

// What the model returned (demo). Each point must quote the contract; point 5 quotes text that is NOT in it.
var SAMPLE_AI = {
  summary: "Hosted scheduling software agreement between Northbridge Analytics (Supplier) and Maple Ridge Dental Group (Client). 12-month term with automatic yearly renewal, payment within 45 days, liability capped at 3 months of fees, governed by British Columbia law.",
  points: [
    { section: "7. Indemnification", risk: "high", quote: "Client shall indemnify, defend and hold harmless Supplier",
      point: "Indemnity runs one way only: Client protects Supplier, nothing in return.",
      ask: "Should indemnity be mutual, at least for IP infringement claims against the software?" },
    { section: "4. Client Data", risk: "high", quote: "Supplier may use Client Data in aggregated form to improve its services and develop new products",
      point: "Supplier can reuse Client Data for product development. For a dental group this may include patient information.",
      ask: "Does the client's privacy obligation allow this? Should the clause require de-identified data only, or be removed?" },
    { section: "8. Termination", risk: "medium", quote: "Supplier may terminate this Agreement for convenience on sixty (60) days written notice",
      point: "Only Supplier can walk away for convenience.",
      ask: "Should Client get the same right, or a transition period to export its data?" },
    { section: "3. Fees and Payment", risk: "low", quote: "Supplier may increase fees once per year with thirty (30) days notice",
      point: "Price increases have no cap.",
      ask: "Cap yearly increases (for example at CPI or 5%)?" },
    { section: "6. Limitation of Liability", risk: "high", quote: "Supplier's total liability under this Agreement is unlimited",
      point: "Liability is unlimited for the Supplier.",
      ask: "Confirm the cap with the client." }
  ]
};
if (typeof module !== "undefined" && module.exports) module.exports = { SAMPLE_CONTRACT: SAMPLE_CONTRACT, SAMPLE_AI: SAMPLE_AI };
