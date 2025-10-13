# Step 1: Build React app
FROM node:18 AS build

WORKDIR /app

ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

COPY package*.json ./
RUN npm install
COPY . ./

RUN npm run build

# Step 2: Serve with nginx
FROM nginx:latest
COPY --from=build /app/build /usr/share/nginx/html

# Add our custom nginx config
COPY nginx-custom.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
