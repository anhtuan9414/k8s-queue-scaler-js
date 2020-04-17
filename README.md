# k8s-queue-scaler
## Required
 - gcloud
 - kubectl

## Auth with user
```
gcloud init
gcloud auth list
```

## Connect to cluster
```
gcloud container clusters get-credentials test-cluster --zone us-east1-b --project precise
```

## Useful command
```
# Run poll scale
npm start
``` 
