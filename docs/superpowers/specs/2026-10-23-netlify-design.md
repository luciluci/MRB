# MRB on Netlify

Deploy the existing demonstration on the user's Netlify account and embed its HTTPS URL in Alpacas page 10693. Preserve the four roles, sample catalogue, order transitions, and local development behavior. Do not upload local saved state or credentials.

## Approach

The user selected Netlify after the WordPress host exposed no Node.js deployment tools. Use Netlify's Next.js adapter and a site-wide Netlify Blobs store for this small shared demonstration. Static export would remove the API; ephemeral files would lose changes. A relational database remains appropriate for a real pilot, but is beyond this demo deployment.

Store one JSON snapshot with strong reads and conditional writes using its ETag. Retry a conflicting action against the latest snapshot up to five times; fail explicitly after that or on storage errors. Local runs and tests with an explicit file path retain file persistence. Preview contexts use a separate store from production. Existing state upgrades apply to both backends.

## Delivery

Publish a dedicated deployment branch in luciluci/MRB. Configure the Netlify project to build that branch with Node 22 and npm run build, publish .next, and set MRB_STORAGE=netlify for runtime. Verify the catalogue, product details, state mutations and refresh persistence before embedding and publishing the Alpacas page. No Search widget. No payments, real orders, new authentication, or local data migration.
