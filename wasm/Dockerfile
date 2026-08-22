FROM emscripten/emsdk:3.1.38

# Install build tools
RUN apt-get update && apt-get install -y \
    gfortran \
    make \
    git \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Copy build script
COPY build_xfoil.sh /build/build_xfoil.sh
RUN chmod +x /build/build_xfoil.sh

# Create output directory
RUN mkdir -p /build/output

CMD ["/build/build_xfoil.sh"]