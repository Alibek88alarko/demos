// SAMPLE DATA. Invented records in the shape of Clark County, NV public lists. Not real people or cases.
(function (root) {
  var data = {
    probate: [
      { case_no: "P-26-118204", filed: "2026-08-12", address: "1234 West Oakey Boulevard, Las Vegas NV 89102", owner: "Estate of R. Delgado", foreclosure_notice: true, years_owned: 31 },
      { case_no: "P-26-118377", filed: "2026-08-19", address: "5520 E Charleston Blvd, Las Vegas NV 89142", owner: "Estate of M. Whitfield", foreclosure_notice: false, years_owned: 24 },
      { case_no: "P-26-118901", filed: "2026-09-02", address: "872 Sunset Rd #B, Henderson NV 89011", owner: "Estate of L. Park", foreclosure_notice: false, years_owned: 12 },
      { case_no: "P-26-119045", filed: "2026-09-09", address: "3301 North Decatur Boulevard, Las Vegas NV 89108", owner: "Estate of J. Okafor", foreclosure_notice: true, years_owned: 18 },
      { case_no: "P-26-119312", filed: "2026-09-21", address: "61 Paradise Hills Dr, Henderson NV 89002", owner: "Estate of A. Novak", foreclosure_notice: false, years_owned: 27 }
    ],
    code: [
      { case_no: "CE-26-40411", address: "1234 W OAKEY BLVD", violation: "Unsecured vacant structure", lien: true, lien_amount: 3850 },
      { case_no: "CE-26-40562", address: "3301 N Decatur Blvd", violation: "Overgrown vegetation, junk vehicles", lien: false },
      { case_no: "CE-26-40733", address: "4410 Spencer Street, Las Vegas NV 89119", violation: "Pool not maintained", lien: false },
      { case_no: "CE-26-40890", address: "2205 S Eastern Ave, Las Vegas NV 89104", violation: "Roof damage, tarp over 90 days", lien: true, lien_amount: 1200 },
      { case_no: "CE-26-41007", address: "5520 East Charleston Boulevard", violation: "Trash and debris", lien: false }
    ],
    tax: [
      { parcel: "162-04-310-021", address: "1234 W. Oakey Blvd.", amount_due: 6412, years: 2, years_owned: 31 },
      { parcel: "139-19-702-008", address: "3301 N DECATUR BLVD", amount_due: 2980, years: 1 },
      { parcel: "177-08-215-044", address: "9050 S Maryland Pkwy, Las Vegas NV 89123", amount_due: 4105, years: 3, years_owned: 22 },
      { parcel: "162-11-604-013", address: "2205 South Eastern Avenue", amount_due: 1730, years: 1 }
    ]
  };
  if (typeof module !== "undefined" && module.exports) module.exports = data;
  else root.SAMPLE = data;
})(this);
