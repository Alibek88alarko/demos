"""Builds samples/enquiries.json: 20 made-up enquiries (sample data) for a catering and events
company, each with a hand-labeled extraction in the exact shape the model returns. The labels
stand in for the model so the pipeline, checks, scoring and CRM step run without an API key.
Cases 7 and 12 contain a deliberate guess (a value that is not in the text) to test the guard."""
import json

def F(value=None, evidence=""):
    return {"value": value, "evidence": evidence}

def L(name=F(), email=F(), phone=F(), company=F(), service_type=F(), guests=F(), budget_usd=F(),
      event_date=F(), urgency=F("normal", ""), summary="", confidence=0.9):
    return dict(name=name, email=email, phone=phone, company=company, service_type=service_type, guests=guests,
                budget_usd=budget_usd, event_date=event_date, urgency=urgency, summary=summary, confidence=confidence)

S = [
 dict(source="form", text="Hi, I'm Laura Bennett from Northwind Logistics. We need corporate catering for 120 people on 2026-11-12, budget around $6,500. Please call me at +1 206 555 0141 or email laura.bennett@northwind.example.",
      label=L(F("Laura Bennett","I'm Laura Bennett"),F("laura.bennett@northwind.example","laura.bennett@northwind.example"),F("+1 206 555 0141","+1 206 555 0141"),F("Northwind Logistics","Northwind Logistics"),F("corporate_catering","corporate catering"),F(120,"120 people"),F(6500,"$6,500"),F("2026-11-12","2026-11-12"),summary="Corporate catering for 120 on 12 Nov, about $6.5k.",confidence=0.95)),
 dict(source="form", text="Wedding on 2027-06-19, about 80 guests, budget is flexible. Mia Torres, mia.t@mail.example",
      label=L(F("Mia Torres","Mia Torres"),F("mia.t@mail.example","mia.t@mail.example"),service_type=F("wedding","Wedding"),guests=F(80,"80 guests"),event_date=F("2027-06-19","2027-06-19"),summary="Wedding for 80 in June 2027, budget not given.",confidence=0.9)),
 dict(source="email", from_email="ops@greenleafcafe.example", message_id="<a1@greenleafcafe.example>", text="Hello, Greenleaf Cafe here. We want to buy your pastries wholesale, roughly $2,400 a month, starting next spring. Thanks, Omar",
      label=L(F("Omar","Omar"),company=F("Greenleaf Cafe","Greenleaf Cafe"),service_type=F("wholesale","wholesale"),budget_usd=F(2400,"$2,400"),summary="Cafe wants monthly wholesale pastries, about $2.4k.",confidence=0.85)),
 dict(source="form", text="URGENT: our caterer cancelled. Private event for 40 people this Saturday 2026-10-31, budget $1,800. Dan Kim 206-555-0177 dan.kim@mail.example",
      label=L(F("Dan Kim","Dan Kim"),F("dan.kim@mail.example","dan.kim@mail.example"),F("206-555-0177","206-555-0177"),service_type=F("private_event","Private event"),guests=F(40,"40 people"),budget_usd=F(1800,"$1,800"),event_date=F("2026-10-31","2026-10-31"),urgency=F("high","URGENT"),summary="Urgent private event for 40 on 31 Oct, $1.8k.",confidence=0.95)),
 dict(source="form", text="Do you do vegan menus? Just asking for now. - Sam, sam.r@mail.example",
      label=L(F("Sam","Sam"),F("sam.r@mail.example","sam.r@mail.example"),service_type=F("other","vegan menus"),summary="General question about vegan menus.",confidence=0.8)),
 dict(source="email", from_email="hr@contoso.example", message_id="<b7@contoso.example>", text="Hi team, Contoso is planning a holiday party for 200 staff on 2026-12-11. Budget $12,000. Who can we talk to? Priya Shah, HR",
      label=L(F("Priya Shah","Priya Shah"),company=F("Contoso","Contoso"),service_type=F("corporate_catering","holiday party for 200 staff"),guests=F(200,"200 staff"),budget_usd=F(12000,"$12,000"),event_date=F("2026-12-11","2026-12-11"),summary="Holiday party for 200 on 11 Dec, $12k.",confidence=0.92)),
 dict(source="form", text="Birthday dinner for my mother, maybe 25 people in March. Can you send prices? Ana, ana.lopez@mail.example",
      label=L(F("Ana","Ana"),F("ana.lopez@mail.example","ana.lopez@mail.example"),F("+1 206 555 0199","phone"),service_type=F("private_event","Birthday dinner"),guests=F(25,"25 people"),summary="Birthday dinner for about 25 in March.",confidence=0.7)),
 dict(source="form", text="Need lunch boxes for a training day, 35 people, 2026-11-04. Around $700. Ben Lowe, Lowe Consulting, ben@loweconsulting.example",
      label=L(F("Ben Lowe","Ben Lowe"),F("ben@loweconsulting.example","ben@loweconsulting.example"),company=F("Lowe Consulting","Lowe Consulting"),service_type=F("corporate_catering","lunch boxes for a training day"),guests=F(35,"35 people"),budget_usd=F(700,"$700"),event_date=F("2026-11-04","2026-11-04"),summary="Lunch boxes for 35 on 4 Nov, $700.",confidence=0.93)),
 dict(source="form", text="hi can u cater", label=L(service_type=F("other","cater"),summary="One-line message, no details.",confidence=0.3)),
 dict(source="email", from_email="events@harborhotel.example", message_id="<c3@harborhotel.example>", text="Harbor Hotel would like a quote for a conference dinner, 150 guests, 2027-02-20, budget up to $9,000. Regards, Jonas Berg, Events Manager, +1 425 555 0102",
      label=L(F("Jonas Berg","Jonas Berg"),phone=F("+1 425 555 0102","+1 425 555 0102"),company=F("Harbor Hotel","Harbor Hotel"),service_type=F("corporate_catering","conference dinner"),guests=F(150,"150 guests"),budget_usd=F(9000,"$9,000"),event_date=F("2027-02-20","2027-02-20"),summary="Conference dinner for 150 on 20 Feb, up to $9k.",confidence=0.94)),
 dict(source="form", text="Small engagement party at home, 15 people on 2026-12-05, $600. Lena 206 555 0123",
      label=L(F("Lena","Lena"),phone=F("206 555 0123","206 555 0123"),service_type=F("private_event","engagement party"),guests=F(15,"15 people"),budget_usd=F(600,"$600"),event_date=F("2026-12-05","2026-12-05"),summary="Engagement party for 15 on 5 Dec, $600.",confidence=0.9)),
 dict(source="form", text="We are a startup, Acme Robotics, team offsite next month for 30. Budget not decided. Contact: tom@acmerobotics.example",
      label=L(F("Tom","tom@"),F("tom@acmerobotics.example","tom@acmerobotics.example"),company=F("Acme Robotics","Acme Robotics"),service_type=F("corporate_catering","team offsite"),guests=F(30,"30"),budget_usd=F(3000,"budget"),summary="Startup offsite for 30 next month, budget open.",confidence=0.75)),
 dict(source="form", text="Wedding 2026-11-28, 60 guests, $5,500. It's very urgent, our venue's caterer dropped out. Grace Park, grace.park@mail.example, 206-555-0168",
      label=L(F("Grace Park","Grace Park"),F("grace.park@mail.example","grace.park@mail.example"),F("206-555-0168","206-555-0168"),service_type=F("wedding","Wedding"),guests=F(60,"60 guests"),budget_usd=F(5500,"$5,500"),event_date=F("2026-11-28","2026-11-28"),urgency=F("high","very urgent"),summary="Urgent wedding for 60 on 28 Nov, $5.5k.",confidence=0.96)),
 dict(source="email", from_email="buyer@freshmart.example", message_id="<d9@freshmart.example>", text="FreshMart grocery chain is looking for a wholesale supplier of ready meals, about $15,000 per month, start 2027-01-15. Please send your catalogue. Kevin Ito",
      label=L(F("Kevin Ito","Kevin Ito"),company=F("FreshMart","FreshMart"),service_type=F("wholesale","wholesale supplier of ready meals"),budget_usd=F(15000,"$15,000"),event_date=F("2027-01-15","2027-01-15"),summary="Grocery chain wants wholesale ready meals, $15k a month from mid-Jan.",confidence=0.9)),
 dict(source="form", text="Hi, I'm Laura Bennett from Northwind Logistics. We need corporate catering for 120 people on 2026-11-12, budget around $6,500. Please call me at +1 206 555 0141 or email laura.bennett@northwind.example.",
      note="exact double submit of enquiry 1", label=None),
 dict(source="form", text="Memorial reception for 50, 2026-11-08, around $2,000. Please reply by tomorrow. Ruth Adler ruth.adler@mail.example",
      label=L(F("Ruth Adler","Ruth Adler"),F("ruth.adler@mail.example","ruth.adler@mail.example"),service_type=F("private_event","Memorial reception"),guests=F(50,"50"),budget_usd=F(2000,"$2,000"),event_date=F("2026-11-08","2026-11-08"),urgency=F("high","reply by tomorrow"),summary="Memorial reception for 50 on 8 Nov, about $2k, needs reply by tomorrow.",confidence=0.9)),
 dict(source="form", text="Are you hiring chefs? Sending my CV. Marco, marco.chef@mail.example",
      label=L(F("Marco","Marco"),F("marco.chef@mail.example","marco.chef@mail.example"),service_type=F("other","hiring chefs"),summary="Job application, not a sales lead.",confidence=0.9)),
 dict(source="form", text="Company picnic for Blue Fin Software, 90 people, 2027-05-30, budget $4,000. Call Ella at +1 206 555 0110.",
      label=L(F("Ella","Ella"),phone=F("+1 206 555 0110","+1 206 555 0110"),company=F("Blue Fin Software","Blue Fin Software"),service_type=F("corporate_catering","Company picnic"),guests=F(90,"90 people"),budget_usd=F(4000,"$4,000"),event_date=F("2027-05-30","2027-05-30"),summary="Company picnic for 90 on 30 May 2027, $4k.",confidence=0.92)),
 dict(source="email", from_email="j.morales@mail.example", message_id="<e2@mail.example>", text="Hi, looking for catering for a baby shower, 20 guests, 2026-11-21, budget about $900. Thanks! Julia Morales",
      label=L(F("Julia Morales","Julia Morales"),service_type=F("private_event","baby shower"),guests=F(20,"20 guests"),budget_usd=F(900,"$900"),event_date=F("2026-11-21","2026-11-21"),summary="Baby shower for 20 on 21 Nov, about $900.",confidence=0.92)),
 dict(source="email", from_email="j.morales@mail.example", message_id="<e2@mail.example>", text="Hi, looking for catering for a baby shower, 20 guests, 2026-11-21, budget about $900. Thanks! Julia Morales",
      note="same email delivered twice by the mail webhook (same Message-ID)", label=None),
]
for i, s in enumerate(S, 1):
    s["id"] = i
json.dump(S, open("samples/enquiries.json", "w"), indent=1, ensure_ascii=False)
print(len(S))
