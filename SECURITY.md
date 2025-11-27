# Security recommendations

- These starter rules allow any authenticated user to read/write rooms. That's okay for a private family game where you share the link only with trusted people.
- For production/public use, consider:
  - Storing a players map (object where keys are UIDs) and allowing reads only if request.auth.uid is in that map.
  - Verifying request.resource on create: hostId == request.auth.uid.
  - Using Cloud Functions to perform sensitive operations (assigning roles) instead of trusting client code.
- Regularly review Firestore usage in the Firebase console and enable billing alerts to avoid unexpected costs.
