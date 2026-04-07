# Launch SEO Checklist

This checklist separates code tasks already handled in the repo from manual launch tasks that still need a real domain, webmaster access, and production approvals.

## Completed In Repo

- Public marketing routes now have route-aware titles, meta descriptions, Open Graph tags, Twitter card basics, and canonical URLs.
- Public pages added for `/privacy`, `/terms`, and `/support`.
- Authenticated and sensitive auth routes are marked `noindex,nofollow` in frontend metadata, and the production Nginx config adds `X-Robots-Tag: noindex, nofollow` for those paths.
- `robots.txt` and `sitemap.xml` are included for local/static builds.
- Frontend container startup now regenerates `robots.txt` and `sitemap.xml` from `VITE_WEB_APP_URL`, so production crawl assets can match the deployed canonical origin without rebuilding the image.
- Favicon and logo references are aligned in `frontend/index.html`.

## Manual Launch Actions Outside The Repo

1. Set `VITE_WEB_APP_URL` to the exact production canonical origin, for example `https://app.your-domain.com`.
2. Open `https://your-domain/robots.txt` and `https://your-domain/sitemap.xml` after deploy to confirm the generated origin is correct.
3. Verify the homepage, pricing page, contact page, support page, privacy page, and terms page in browser dev tools or an SEO inspector to confirm titles, descriptions, canonical links, and Open Graph tags resolve correctly.
4. Submit the sitemap URL to Google Search Console.
5. Submit the site and sitemap to Bing Webmaster Tools.
6. Complete domain ownership verification in Google Search Console and Bing Webmaster Tools.
7. Request indexing for the primary public routes after deployment if the site is new.
8. Confirm that private/auth routes such as `/dashboard`, `/payroll`, `/settings`, `/login`, `/reset-password`, `/verify-email`, and `/accept-invite/...` are not indexable.
9. Replace placeholder share-preview assets or add richer social images if marketing needs branded social cards before launch.

## Notes

- The repo can prepare metadata and crawl assets, but search visibility still depends on production domain setup, webmaster verification, and post-deploy submission.
- Do not rely on the placeholder legal text as final launch copy; legal review is still required.
