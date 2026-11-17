# Flicks on noon: concept demo

Clickable concept of the noon app (UAE, English) with Flicks in noon's current ad placements. Open "Explore Flicks" to jump to each one:

1. Homepage Hero Slider (Nike)
2. Brand Ads in search (Under Armour)
3. Brand Ads on product pages (Levi's)
4. noon finds (Zara, Acer)

Works on desktop (phone frame) and on a phone (full screen). Product names, photos and prices are from noon's UAE catalogue, loaded from noon's image servers. Prices reflect Early Yellow Friday deals at the time of building.

Built by Flam for partner conversations. Not affiliated with or endorsed by noon or the brands shown.

## Testing

Built on Flicks Demo Kit v1.1. Run `python3 qa.py index.html --live` to test every flow on 15 iPhone, Android, tablet and desktop sizes. Add `?flicks=stub` to the URL to see the layout without loading Flicks, and `?os=android` or `?os=ios` to force a skin.
