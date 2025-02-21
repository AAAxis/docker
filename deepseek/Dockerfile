# Use a base image with the necessary dependencies
FROM ubuntu:latest

# Install necessary packages
RUN apt-get update && apt-get install -y \
    curl \
    git \
    python3 \
    python3-pip

# Install Ollama
RUN curl -fsSL https://ollama.ai/install.sh | sh

# Set the working directory
WORKDIR /app

# Expose the port that Deepseek will run on
EXPOSE 8080

# Command to run Ollama in the background and serve the model
CMD sh -c "nohup ollama start & && ollama pull deepseek-r1:7b && ollama serve"