# Psychrometrics and HVAC systems

Airport Building Systems · HVAC · one 2-hour session, 67 slides, each built step by step (→).

Scope: properties of moist air and use of the psychrometric chart; psychrometric processes and the
equipment that performs each one; air handling unit configuration according to outdoor conditions;
heat and cold generation (boilers, vapour-compression chillers and heat pumps, refrigerants);
HVAC system types; design and dimensioning, leading into Practicum Exercise 3.
Replaces the psychrometrics part of S2 and the content of S3 (1) Equipment & systems and S3 (2) Design & dimensioning.

| # | Section | Contents | Minutes |
|---|---------|----------|---------|
| 0 | Introduction | contents, cooling load components (recap of S2) | 5 |
| 1 | Moist air properties and the psychrometric chart | humidity ratio, saturation, relative humidity, dew point, wet bulb, enthalpy, reading a state point, sensible heat ratio, indoor design conditions | 20 |
| 2 | Psychrometric processes and equipment | heating, sensible cooling, cooling and dehumidification, condensate, apparatus dew point and bypass factor, reheat, humidification, evaporative cooling, mixing, heat recovery | 25 |
| 3 | Air handling unit: processes by outdoor condition | outdoor design conditions, required processes by region, summer (dry / humid), winter, free cooling, interactive climate selector, AHU components and sequence, supply flow rate, coil capacity, AHU types | 25 |
| 4 | Heat and cold generation | supply water temperatures, condensing boilers, saturation temperature vs pressure, refrigeration cycle, p–h diagram, temperature lift and COP, heat pump and defrost, refrigerants, R744, chiller types | 22 |
| 5 | HVAC system types | classification, controlled variables, all-air, air-water, all-water, refrigerant-air (split, VRF), rooftop units, comparison | 13 |
| 6 | Design and dimensioning | design criteria, selection by airport space, dimensioning, IDAE restaurant example, Exercise 3 deliverables, summary | 10 |

Editing: each section is one file in `sections/`. A slide is a title, a list of steps (one sentence
each, revealed with →) and a drawing whose parts appear at the step they belong to. All psychrometric
values are computed with `../systems/psychro.js` and `../systems/models.js`.
