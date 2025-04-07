Prerequisites

Docker

Kubernetes cluster (Minikube, Docker Desktop, or cloud provider)

kubectl CLI tool

Git

Setup Instructions

1. Clone the Repository

Clone this repository to your local machine:

git clone https://github.com/huylx222/sit323-737-2024-t1-prac9p.git

cd sit323-737-2024-t1-prac9p


2. Deploy MongoDB to Kubernetes

Apply the MongoDB persistent volume and claim:

bashCopykubectl apply -f mongodb-pv-pvc.yaml

Create the MongoDB credentials secret:

kubectl apply -f mongodb-secret.yaml

Deploy MongoDB:

bashCopykubectl apply -f mongodb-deployment.yaml


3. Deploy the Calculator Application

Build and push the Docker image (optional, image is already available on Docker Hub):

bashCopydocker build -t lehuy222/calculator-app:p9.1 .

docker push lehuy222/calculator-app:p9.1

Deploy the calculator application:

kubectl apply -f deployment.yaml

Deploy the service:

kubectl apply -f service.yaml


4. Verify the Deployment

Check that all pods are running:

bashCopykubectl get pods


5. Test the Application

Forward a local port to the calculator service:

kubectl port-forward svc/calculator-app-service 3000:3000

Test basic calculator operations:

curl "http://localhost:3000/add?num1=10&num2=5"

curl "http://localhost:3000/subtract?num1=10&num2=5"

curl "http://localhost:3000/multiply?num1=10&num2=5"

curl "http://localhost:3000/divide?num1=10&num2=5"

Check MongoDB integration:

curl "http://localhost:3000/db-health"

curl "http://localhost:3000/history"
