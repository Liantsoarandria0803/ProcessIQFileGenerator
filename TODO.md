## 🗺️ TODO: Complete Airtable → MongoDB Migration (migration-mongodb branch)

**Status: ⏳ IN PROGRESS** | **Plan approved: YES** | **Target: 100% MongoDB/GridFS, 0 Airtable**

### 📋 Steps (sequential)

#### ✅ 1. Create this TODO.md [COMPLETE]
- `create_file ProcessIQFileGenerator/TODO.md`

#### ⏳ 2. DELETE Airtable utils (safe)
```
DELETE: src/utils/airtable.ts
DELETE: src/utils/airtableClient.ts
```
**Verify:** No import errors on restart.

#### ⏳ 3. REPLACE legacy PDF repos → Mongo inline
```
src/repositories/resultatPdfRepository.ts → ResultatPdfMongoRepository logic
src/repositories/resultatEntretienRepository.ts → ResultatEntretienMongoRepository logic  
```
**Inline GridFS upload, {id, fields} format preserved.**

#### ⏳ 4. MAIN: src/routes/admission.ts → Mongo-only
```
- Remove: CandidatRepository, isMongoConnected() fallbacks
- Use ONLY: *MongoRepository imports
- PDFs: Always GridFS upload → Mongo attachment refs
- Remove: tmpfiles.org/Airtable upload logic
```
**Critical: All endpoints MongoDB-only.**

#### ⏳ 5. src/index.ts → Require MongoDB
```
- Fail if no MONGODB_URI
- Remove Airtable-only fallback logs
```

#### ⏳ 6. Repositories index.ts → Mongo-only exports
```
Export: CandidatMongoRepository, etc. (hide legacy)
```

#### ⏳ 7. Services cleanup
```
Services/*GeneratorService.ts: Remove Airtable imports
config/index.ts: Remove config.airtable
types: Remove airtable_record_id if unused
```

#### ⏳ 8. package.json → Remove Airtable deps
```
npm uninstall airtable axios (if unused)
```

#### ✅ 9. Test & Complete
```
npm run dev → No Airtable errors/logs
Test: All PDF endpoints → GridFS URLs
Run: src/scripts/run-migration.ts (migrate data)
attempt_completion
```

### 🔍 Progress Tracking
```
[ ] 2/9 DELETE utils  
[ ] 3/9 REPLACE repos
[ ] 4/9 ROUTES admission.ts ⚠️ CRITICAL
[ ] 5/9 index.ts
[ ] 6/9 repos index
[ ] 7/9 Services cleanup
[ ] 8/9 package.json
[✅] 9/9 Test → attempt_completion
```

### 📝 Notes
- **PDF Storage:** ✅ GridFS direct (no tmpfiles/Airtable)
- **API:** Identical ({id, fields} format)
- **Migration:** Run `src/scripts/run-migration.ts` before prod
- **Deploy:** Render MongoDB ready

**Current step → Reply "next" or "step N"**

