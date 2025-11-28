# TODO - Flight Budget Calculator

## Critical Issues

### 🔴 Aircraft Persistence Logic (Buggy)

**Current Implementation:**
- Uses browser localStorage (client-side only)
- Data lost when clearing browser cache
- Not shared across devices/users
- Buggy behavior when saving/loading

**Location:** `index.html:456-461` (defaultAircraft array and related functions)

**Proposed Solution:**

#### Option 1: Simple Global Defaults (No Backend)
- Store default aircraft in Docker volume (`/usr/share/nginx/html/data/aircraft-defaults.json`)
- Users can still save/load their own configs as JSON files (current behavior)
- Pros: Simple, no backend needed
- Cons: Not multi-user, still relies on local file system

#### Option 2: Backend API (Recommended)
- Add lightweight backend (Node.js/Express or Python/Flask)
- Store global defaults in volume
- Add optional user accounts for personalized settings
- API endpoints:
  - `GET /api/aircraft/defaults` - Get global defaults
  - `POST /api/aircraft/defaults` - Update defaults (admin)
  - `GET /api/aircraft/user/:id` - Get user aircraft
  - `POST /api/aircraft/user/:id` - Save user aircraft
- Pros: Proper persistence, multi-user support
- Cons: More complex, requires backend container

#### Option 3: Hybrid Approach
- Global defaults stored in volume (`/data/aircraft-defaults.json`)
- Served as static JSON file via nginx
- JavaScript fetches defaults on load
- Users save personal configs to localStorage or download JSON
- Pros: Simple, works for most use cases
- Cons: Global defaults require container restart to update

**Recommended:** Start with Option 3 (Hybrid), migrate to Option 2 if user accounts needed

**Files to Modify:**
- `index.html` - Update aircraft loading/saving logic
- `data/aircraft-defaults.json` - Create default aircraft config file
- `nginx/nginx.conf` - Add endpoint for serving JSON (already configured)

**Testing Required:**
- [ ] Load default aircraft on page load
- [ ] Save custom aircraft to localStorage
- [ ] Export/import aircraft configs as JSON
- [ ] Verify persistence across container restarts
- [ ] Test with multiple aircraft types

---

## GitHub Repository Setup

- [ ] Create GitHub repository: `ryakel/flight-budget`
- [ ] Push code to repository
- [ ] Add repository description
- [ ] Set up GitHub secrets:
  - [ ] `DOCKER_USERNAME`
  - [ ] `DOCKER_PASSWORD`
  - [ ] `PORTAINER_WEBHOOK_URL` (after Portainer setup)
- [ ] Configure branch protection for `main`
- [ ] Add topics/tags: docker, nginx, aviation, flight-training

---

## Deployment Tasks

- [ ] Deploy stack in Portainer
- [ ] Create Portainer webhook
- [ ] Add webhook URL to GitHub secrets
- [ ] Test automated deployment workflow
- [ ] Configure nginx reverse proxy
- [ ] Set up SSL certificate (Let's Encrypt)
- [ ] Configure DNS (budget.yourdomain.com)
- [ ] Test production deployment
- [ ] Set up monitoring/alerting

---

## Documentation Updates

- [ ] Add screenshots to README.md
- [ ] Create video tutorial (optional)
- [ ] Add troubleshooting section based on real issues
- [ ] Document API endpoints (if backend added)
- [ ] Add changelog/release notes

---

## Testing & QA

- [ ] Test CSV import with various ForeFlight exports
- [ ] Test all certification types (IR, CPL, CFI)
- [ ] Verify calculations are accurate
- [ ] Test PDF export on different browsers
- [ ] Mobile responsiveness testing
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Load testing (if expecting high traffic)

---

## Feature Enhancements (Future)

### High Priority
- [ ] Fix aircraft persistence (see above)
- [ ] Add error handling for invalid CSV files
- [ ] Improve mobile UI/UX
- [ ] Add data validation for user inputs

### Medium Priority
- [ ] Add dark mode toggle
- [ ] Export to multiple formats (Excel, CSV)
- [ ] Add currency selection (USD, EUR, etc.)
- [ ] Save multiple budget scenarios
- [ ] Add comparison view (compare different aircraft)

### Low Priority
- [ ] User accounts/authentication
- [ ] Share budget with instructor/students
- [ ] Integration with flight school APIs
- [ ] Add more certification types
- [ ] Gamification (progress badges, etc.)

---

## Security & Compliance

- [ ] Security audit of container image
- [ ] Penetration testing
- [ ] Add rate limiting
- [ ] GDPR compliance (if storing user data)
- [ ] Terms of service / Privacy policy
- [ ] Cookie consent banner (if needed)

---

## Performance Optimization

- [ ] Add service worker for offline functionality
- [ ] Optimize JavaScript bundle size
- [ ] Lazy load Chart.js (only when needed)
- [ ] Add CDN for static assets
- [ ] Implement caching strategy
- [ ] Add Redis for session management (if backend added)

---

## Monitoring & Analytics

- [ ] Add application monitoring (optional)
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Add usage analytics (privacy-friendly)
- [ ] Container metrics (Prometheus/Grafana)
- [ ] Log aggregation (ELK stack)

---

## Backup & Disaster Recovery

- [ ] Automate volume backups
- [ ] Test restore procedure
- [ ] Document disaster recovery plan
- [ ] Set up off-site backups

---

## CI/CD Improvements

- [ ] Add automated testing in GitHub Actions
- [ ] Add linting (ESLint, Prettier)
- [ ] Add security scanning (Snyk, Trivy)
- [ ] Implement semantic versioning
- [ ] Add staging environment
- [ ] Implement blue/green deployments

---

## Timeline Estimate

### Phase 1: Critical (This Week)
- Fix aircraft persistence logic
- Deploy to production
- Test automated deployments

### Phase 2: Important (Next 2 Weeks)
- Add proper error handling
- Improve mobile UI
- Complete testing suite

### Phase 3: Nice-to-Have (Next Month)
- User accounts (if needed)
- Additional features
- Performance optimization

---

## Notes

- Keep it simple - don't over-engineer
- Focus on reliability and user experience
- Security is paramount
- Document everything

---

**Last Updated:** 2025-11-27
**Priority:** Fix aircraft persistence first, then deploy
