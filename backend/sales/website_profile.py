import json
import re
import ssl
import time
from html import unescape
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


WEBSITE_URLS = [
    "https://marinedubai.ae/",
    "http://marinedubai.ae/",
]
CACHE_TTL_SECONDS = 15 * 60

_CACHE = {"expires_at": 0, "value": None}

DEFAULT_COMPANY_PROFILE = {
    "company_name": "Majestic Ships & Boats Components Trading L.L.C",
    "client_name": "Majestic Ships & Boats Components Trading L.L.C",
    "client_location": "Dubai, United Arab Emirates",
    "email": "info@marinedubai.com",
    "phone_no": "+971504250560",
    "service_categories": [
        "Surface Protection Coating",
        "Machining",
        "Yacht & Boat Services",
        "Electric Motor Repair Service",
        "GRP, GRE & HDPE Pipe Repairs",
        "Fabrication Works",
        "Mechanical Seal Repairing",
        "Laser Alignment & Line Boring",
        "NGP Cleaning & Flushing",
        "Pumps & Valves Overhauling",
        "Ship & Yard Repair Works",
        "Vibration Analysis & Dynamic Balancing",
        "Water & Waste Water Processing",
    ],
    "brief_services": [
        "Provide onsite machining, line boring, flange facing, and berth-side machining support for marine and industrial assets.",
        "Carry out pumps and valves overhauling, inspection, pressure testing, and recommissioning for vessel and plant systems.",
        "Execute GRP, GRE, and HDPE pipe repair works including inspection, rectification, and service-life restoration.",
        "Undertake fabrication works in steel, stainless steel, and aluminum for marine structures, supports, and equipment modifications.",
        "Deliver yacht, boat, ship, and yard repair services covering maintenance, mechanical rectification, and operational readiness support.",
        "Perform NGP chemical cleaning and flushing, electric motor repair, surface protection coating, and related marine technical services.",
    ],
}


def _cost_item(item_id, item_name, details, unit="Job", cost=0, display_order=1):
    return {
        "id": item_id,
        "item_name": item_name,
        "details": details,
        "unit": unit,
        "cost": cost,
        "display_order": display_order,
        "is_active": True,
    }


DEFAULT_COST_ESTIMATION_OPTIONS = {
    "rawMaterial": [
        _cost_item(1101, "Duramax Marine Bearings & Seals", "Marine-grade shaft bearings and seals for propulsion and rotating equipment.", "Set", 18500, 1),
        _cost_item(1102, "Metaline Surface Protection Coating", "Protective coating system for corrosion, wear, and chemical attack resistance.", "Kit", 14250, 2),
        _cost_item(1103, "Chesterton Sealing Solutions", "Industrial sealing, coating, and maintenance consumables for rotating equipment.", "Set", 9600, 3),
        _cost_item(1104, "PropGlide Foul Release Coating", "Specialized foul-release coating for propellers and underwater running gear.", "Kit", 12800, 4),
        _cost_item(1105, "Sikaflex Sealants & Adhesives", "Marine sealants and adhesives for ship repair, fabrication, and fit-out work.", "Tube", 850, 5),
        _cost_item(1106, "NGP Cleaning & Flushing Chemicals", "Chemical cleaning and flushing materials for pipelines, exchangers, and hydraulic circuits.", "Lot", 6750, 6),
        _cost_item(1107, "Centek Exhaust & Ventilation Components", "Marine exhaust and ventilation accessories for onboard air-flow systems.", "Set", 15400, 7),
        _cost_item(1108, "PolyPad Grouting Solutions", "Machinery grouting compound for alignment, bonding, and vibration dampening.", "Set", 7350, 8),
        _cost_item(1109, "Sorb Spill Containment Solutions", "Absorbents and spill response materials for marine and industrial operations.", "Pack", 2250, 9),
    ],
    "productionCost": [
        _cost_item(2101, "Onsite Machining Services", "Line boring, flange facing, orbital milling, and other precision machining support.", "Job", 24500, 1),
        _cost_item(2102, "Pump & Valve Overhauling", "Overhauling, inspection, repair, and testing of marine pumps and valves.", "Job", 16800, 2),
        _cost_item(2103, "GRP / GRE / HDPE Pipe Repair", "Repair and restoration of composite and HDPE piping systems.", "Job", 13200, 3),
        _cost_item(2104, "Fabrication Works", "Custom steel, stainless steel, and aluminum fabrication for marine and industrial assets.", "Job", 21400, 4),
        _cost_item(2105, "Ship & Yard Repair Works", "Repair, maintenance, and readiness work for vessels and yard facilities.", "Job", 29800, 5),
        _cost_item(2106, "Yacht & Boat Services", "Maintenance, modification, and repair support for yachts and boats.", "Job", 23600, 6),
        _cost_item(2107, "Electric Motor Repair Service", "Diagnostics, rewinding, repair, and recommissioning of electric motors.", "Job", 14500, 7),
        _cost_item(2108, "Chemical Cleaning & Flushing", "System cleaning and flushing for operational recovery and contamination removal.", "Job", 11800, 8),
        _cost_item(2109, "Surface Protection Coating", "Application of anti-corrosion and wear-resistant protective coatings.", "Job", 15400, 9),
    ],
    "addonCost": [],
    "sewingCost": [
        _cost_item(3101, "Marine Service Engineer", "Engineer for survey, planning, supervision, and technical execution support.", "Man-day", 3200, 1),
        _cost_item(3102, "Onsite Machinist", "Specialist machinist for line boring, flange facing, and precision repair tasks.", "Man-day", 2850, 2),
        _cost_item(3103, "Pump / Valve Technician", "Technician for dismantling, inspection, overhauling, and testing.", "Man-day", 2450, 3),
        _cost_item(3104, "Pipe Repair Technician", "Technician for GRP, GRE, and HDPE pipe rectification works.", "Man-day", 2350, 4),
        _cost_item(3105, "Fabricator / Welder", "Fabrication crew for steel, stainless steel, and aluminum work packages.", "Man-day", 2550, 5),
        _cost_item(3106, "Electric Motor Technician", "Technician for electrical motor inspection, repair, and assembly.", "Man-day", 2400, 6),
        _cost_item(3107, "QA / QC Inspector", "Inspection resource for dimensional, visual, and completion verification.", "Man-day", 2100, 7),
        _cost_item(3108, "Site Supervisor", "Supervisor for shift coordination, safety, and customer reporting.", "Man-day", 2750, 8),
    ],
    "packagingLogistics": [
        _cost_item(4101, "Marine Site Mobilization", "Mobilization of technicians, tools, and job consumables to vessel or yard.", "Trip", 4200, 1),
        _cost_item(4102, "Equipment & Tool Transport", "Transport of machining tools, repair kits, and testing equipment.", "Trip", 3650, 2),
        _cost_item(4103, "Pickup & Delivery Coordination", "Collection and delivery of repaired parts, pumps, valves, and motors.", "Trip", 2400, 3),
        _cost_item(4104, "Port / Yard Access Logistics", "Gate pass coordination, handling, and access-related logistics support.", "Job", 1850, 4),
        _cost_item(4105, "Heavy Item Handling Transport", "Flatbed, crane, or specialized handling transport for oversized components.", "Trip", 5600, 5),
    ],
    "miscellaneous": [],
}


def _fetch_html():
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36"
        )
    }
    last_error = None
    ssl_context = ssl.create_default_context()

    for url in WEBSITE_URLS:
        try:
            request = Request(url, headers=headers)
            with urlopen(request, timeout=12, context=ssl_context) as response:
                return response.read().decode("utf-8", errors="ignore"), url, None
        except (HTTPError, URLError, TimeoutError, OSError) as exc:
            last_error = str(exc)

    return "", WEBSITE_URLS[0], last_error or "Unable to fetch website."


def _clean_html_to_lines(html):
    if not html:
        return []

    cleaned = re.sub(r"(?is)<(script|style|noscript).*?>.*?</\1>", " ", html)
    cleaned = re.sub(r"(?i)<br\s*/?>", "\n", cleaned)
    cleaned = re.sub(r"(?i)</(p|div|section|article|li|h1|h2|h3|h4|h5|h6)>", "\n", cleaned)
    cleaned = re.sub(r"(?s)<[^>]+>", " ", cleaned)
    cleaned = unescape(cleaned)
    cleaned = cleaned.replace("\xa0", " ")
    lines = []
    for raw_line in cleaned.splitlines():
        line = re.sub(r"\s+", " ", raw_line).strip(" -\t\r\n")
        if len(line) >= 3:
            lines.append(line)
    return lines


def _normalize_phone(phone):
    phone = re.sub(r"[^\d+]", "", phone)
    if phone.count("+") > 1:
        phone = phone.replace("+", "")
    if "+" in phone and not phone.startswith("+"):
        phone = phone.replace("+", "")
    return phone


def _looks_like_service(line):
    lowered = line.lower()
    keywords = [
        "service",
        "services",
        "marine",
        "repair",
        "maintenance",
        "installation",
        "inspection",
        "supply",
        "equipment",
        "solutions",
        "rental",
        "trading",
        "fabrication",
        "overhaul",
        "spare",
        "parts",
        "support",
        "engineering",
    ]
    blocked = [
        "copyright",
        "all rights reserved",
        "privacy policy",
        "terms and conditions",
        "home",
        "contact us",
        "about us",
        "read more",
        "call now",
        "submit",
        "menu",
    ]
    return (
        any(keyword in lowered for keyword in keywords)
        and not any(keyword in lowered for keyword in blocked)
        and len(line.split()) <= 14
    )


def _dedupe_preserve_order(values):
    seen = set()
    result = []
    for value in values:
        key = value.strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        result.append(value.strip())
    return result


def _extract_services(lines):
    services = []
    for line in lines:
        if _looks_like_service(line):
            services.append(line)
    return _dedupe_preserve_order(services)[:20]


def _extract_briefs(lines, services):
    service_keys = {service.lower() for service in services}
    briefs = []
    for line in lines:
        lowered = line.lower()
        if lowered in service_keys:
            continue
        if len(line.split()) < 6 or len(line.split()) > 28:
            continue
        if any(word in lowered for word in ["service", "marine", "support", "repair", "maintenance", "installation", "supply"]):
            briefs.append(line)
    return _dedupe_preserve_order(briefs)[:12]


def _extract_company_name(html, lines):
    title_match = re.search(r"(?is)<title>(.*?)</title>", html)
    if title_match:
        title_text = re.sub(r"\s+", " ", unescape(title_match.group(1))).strip(" |-")
        if title_text:
            return title_text.split("|")[0].split("-")[0].strip()
    for line in lines[:20]:
        if "marine" in line.lower():
            return line
    return "Marine Dubai"


def _extract_contact(lines, html):
    emails = _dedupe_preserve_order(
        re.findall(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", html, flags=re.I)
    )
    phones = _dedupe_preserve_order(
        _normalize_phone(match)
        for match in re.findall(r"(?:\+?\d[\d\s().-]{7,}\d)", html)
    )

    address = ""
    for line in lines:
        lowered = line.lower()
        if (
            any(keyword in lowered for keyword in ["address", "location", "office", "warehouse"])
            and any(keyword in lowered for keyword in ["dubai", "uae", "u.a.e"])
        ):
            address = line
            break
    if not address:
        for line in lines:
            lowered = line.lower()
            if "dubai" in lowered and len(line.split()) >= 4:
                address = line
                break

    return {
        "email": emails[0] if emails else "",
        "phone_no": phones[0] if phones else "",
        "client_location": address,
    }


def _section_for_service(service_name):
    lowered = service_name.lower()
    if any(keyword in lowered for keyword in ["supply", "spare", "parts", "equipment", "product"]):
        return "rawMaterial"
    if any(keyword in lowered for keyword in ["logistics", "transport", "delivery", "shipping"]):
        return "packagingLogistics"
    if any(keyword in lowered for keyword in ["manpower", "crew", "technician", "engineer", "labour", "labor", "staff", "welding", "fabrication"]):
        return "sewingCost"
    if any(keyword in lowered for keyword in ["support", "consult", "survey", "certification", "documentation"]):
        return "addonCost"
    if any(keyword in lowered for keyword in ["repair", "maintenance", "overhaul", "installation", "commissioning", "testing", "inspection", "service", "solution", "engineering"]):
        return "productionCost"
    return "addonCost"


def _build_cost_catalog(services, briefs):
    catalog = {
        "rawMaterial": [],
        "productionCost": [],
        "addonCost": [],
        "sewingCost": [],
        "packagingLogistics": [],
    }

    description_lookup = {service.lower(): "" for service in services}
    for brief in briefs:
        for service in services:
            service_key = service.lower()
            if service_key in brief.lower() and not description_lookup[service_key]:
                description_lookup[service_key] = brief

    identifier = 1000
    for index, service in enumerate(services, start=1):
        section = _section_for_service(service)
        catalog[section].append(
            {
                "id": identifier + index,
                "item_name": service,
                "details": description_lookup.get(service.lower(), "") or service,
                "unit": "Job",
                "cost": 0,
                "display_order": index,
                "is_active": True,
            }
        )

    if briefs:
        base_index = len(services) + 1
        for index, brief in enumerate(briefs[:8], start=base_index):
            catalog["addonCost"].append(
                {
                    "id": identifier + 500 + index,
                    "item_name": brief[:120],
                    "details": brief,
                    "unit": "Job",
                    "cost": 0,
                    "display_order": index,
                    "is_active": True,
                }
            )

    if not any(catalog.values()):
        catalog["addonCost"].append(
            {
                "id": 1999,
                "item_name": "General Marine Service",
                "details": "Fallback website-derived service placeholder when the live site does not expose structured service lines.",
                "unit": "Job",
                "cost": 0,
                "display_order": 1,
                "is_active": True,
            }
        )

    return catalog


def _build_profile_payload(html, url, fetch_error):
    lines = _clean_html_to_lines(html)
    contact = _extract_contact(lines, html)
    company_name = _extract_company_name(html, lines)
    if not company_name or company_name.lower() == "marine dubai":
        company_name = DEFAULT_COMPANY_PROFILE["company_name"]

    merged_contact = {
        "client_location": contact["client_location"] or DEFAULT_COMPANY_PROFILE["client_location"],
        "email": contact["email"] or DEFAULT_COMPANY_PROFILE["email"],
        "phone_no": contact["phone_no"] or DEFAULT_COMPANY_PROFILE["phone_no"],
    }

    return {
        "source_url": url,
        "source_status": "live" if html else "fallback",
        "source_error": fetch_error or "",
        "company_name": company_name,
        "client_name": DEFAULT_COMPANY_PROFILE["client_name"],
        "client_location": merged_contact["client_location"],
        "email": merged_contact["email"],
        "phone_no": merged_contact["phone_no"],
        "service_categories": list(DEFAULT_COMPANY_PROFILE["service_categories"]),
        "brief_services": list(DEFAULT_COMPANY_PROFILE["brief_services"]),
        "cost_estimation_options": json.loads(json.dumps(DEFAULT_COST_ESTIMATION_OPTIONS)),
    }


def get_website_profile(force_refresh=False):
    now = time.time()
    if not force_refresh and _CACHE["value"] and _CACHE["expires_at"] > now:
        return _CACHE["value"]

    html, url, fetch_error = _fetch_html()
    profile = _build_profile_payload(html, url, fetch_error)
    _CACHE["value"] = profile
    _CACHE["expires_at"] = now + CACHE_TTL_SECONDS
    return profile


def get_website_profile_json():
    return json.dumps(get_website_profile())
