# Menu Cost Pro

Build a polished full-stack web app called "Menu Cost Pro" for restaurant recipe costing and menu price optimization.

Goal: calculate the true cost and recommended selling price of each menu item from exact ingredient prices/quantities plus restaurant overheads.

Build an MVP that is actually usable, not a mockup.

Core areas:
1. Dashboard: total monthly fixed costs, ingredient cost coverage, dishes analyzed, items needing price review, estimated monthly contribution.
2. Ingredients master: CRUD table with ingredient name, category, purchase unit (kg, g, litre, ml, piece, packet), purchase quantity, purchase price, usable yield %, and automatically calculated effective cost per base unit. Support price updates/history.
3. Recipes: create/edit a menu item; add unlimited ingredients with recipe quantity and unit; automatically calculate each ingredient line cost, total recipe/ingredient cost, yield/portion information, wastage allowance, packaging cost, cooking fuel allocation, and total variable cost per serving.
4. Restaurant Expenses: monthly rent, salaries, electricity, gas/fuel, water, maintenance, cleaning, marketing, other expenses. Allow expected monthly sales and/or expected monthly portions. Calculate an overhead allocation method transparently.
5. Menu Pricing: show each dish's ingredient cost, variable cost, allocated overhead, true cost, current selling price, contribution per plate, contribution margin %, recommended price, minimum sustainable price, and target-margin price. Allow target profit margin and rounding to sensible ₹5/₹10 prices.
6. Dish detail: show a clear price waterfall: ingredients -> wastage -> variable costs -> overhead -> target profit -> recommended price. Include what-if controls for ingredient price changes and selling price changes.
7. Reports: menu profitability ranking, highest-cost ingredients, dishes below target margin, and price-change recommendations.

Important calculation rules:
- Never hide the formula. Show calculation details.
- Ingredient cost = effective cost per base unit × recipe quantity.
- Effective ingredient cost must account for yield/wastage.
- Variable cost = recipe ingredient cost + recipe-level wastage + packaging + cooking/fuel allocation.
- Monthly overhead = rent + salaries + electricity + gas/fuel + water + maintenance + cleaning + marketing + other.
- Overhead allocation should support both "per expected portion" and "percentage of sales" methods; default to per expected portion if expected portions are entered.
- Recommended price should be based on true cost and target margin: true cost / (1 - target margin), then rounded to a configurable ₹5 or ₹10 increment.
- Also show minimum sustainable price (true cost) and contribution at current price.
- Do not double-count gas/electricity if the user explicitly allocates them per recipe; make the allocation settings clear.

Seed the app with realistic sample data for a Pondicherry/Indian restaurant, including Mutton Kaal Paaya, Mutton Botti, Fried Parotta, and Biryani, so the interface is immediately understandable. Use INR formatting.

UI:
- Modern professional restaurant-business dashboard.
- Clean light interface with deep navy/charcoal accents, restrained green for healthy margins and red/amber for problems.
- Responsive desktop/tablet/mobile.
- Sidebar navigation: Dashboard, Ingredients, Recipes, Expenses, Menu Pricing, Reports, Settings.
- Strong tables, filters, search, edit dialogs, empty states, validation, confirmation for deletes.
- No emojis.
- Use INR ₹ throughout.
- Make calculations update instantly when inputs change.

Persistence:
Use Supabase/PostgreSQL for persistent data. Create a sensible relational schema for ingredients, ingredient price history, recipes, recipe ingredients, expenses, pricing settings, and menu prices. Add basic authentication-ready structure but keep the initial MVP simple.

The app should be designed so this can later become a feature inside my existing "Viveka Billing" restaurant POS, but keep this project standalone for now.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/482d3cd6-f7b1-459e-8915-c53fd8f459b9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
