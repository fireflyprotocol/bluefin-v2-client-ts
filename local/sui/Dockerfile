FROM rust:latest AS builder

RUN apt-get update \
&& apt-get install -y --no-install-recommends \
curl \
tzdata \
libprotobuf-dev \
ca-certificates \
build-essential \
libssl-dev \
libclang-dev \
pkg-config \
openssl \
protobuf-compiler \
git \
clang \
libclang-dev \
libpq-dev \
cmake \
gcc \
nano

RUN cargo install --locked --git https://github.com/MystenLabs/sui.git sui

RUN cargo install --git https://github.com/move-language/move move-analyzer --branch sui-move --features "address32"

WORKDIR /app

RUN git clone https://github.com/MystenLabs/sui.git

WORKDIR /app/sui

RUN cargo build --release --bin sui-faucet

# Move the binary to the desired location
RUN mv /app/sui/target/release/sui-faucet /usr/local/cargo/bin

FROM rust:latest

RUN apt-get update \
&& apt-get install -y --no-install-recommends \
curl \
tzdata \
libprotobuf-dev \
ca-certificates \
build-essential \
libssl-dev \
libclang-dev \
pkg-config \
openssl \
protobuf-compiler \
git \
clang \
libclang-dev \
libpq-dev \
cmake \
gcc \
nano \
jq

COPY --from=builder  /usr/local/cargo/* /usr/local/cargo/bin

# Copy scripts to the appropriate location and make them executable
COPY gen-accounts.sh /usr/local/bin/gen-accounts.sh

RUN chmod +x /usr/local/bin/gen-accounts.sh

COPY extract-addresses.sh /usr/local/bin/extract-addresses.sh

RUN chmod +x /usr/local/bin/extract-addresses.sh

COPY gas.sh /usr/local/bin/gas.sh

RUN chmod +x /usr/local/bin/gas.sh

COPY faucet.sh /usr/local/bin/faucet.sh

RUN chmod +x /usr/local/bin/faucet.sh

COPY merge-coins.sh /usr/local/bin/merge-coins.sh

RUN chmod +x /usr/local/bin/merge-coins.sh

COPY batch.sh /usr/local/bin/batch.sh

RUN chmod +x /usr/local/bin/batch.sh

COPY replace_deployer_seed.sh /usr/local/bin/replace_deployer_seed.sh

RUN chmod +x /usr/local/bin/replace_deployer_seed.sh

COPY refresh_test_accounts.sh /usr/local/bin/refresh_test_accounts.sh

RUN chmod +x /usr/local/bin/refresh_test_accounts.sh

COPY run_tests.sh /usr/local/bin/run_tests.sh

RUN chmod +x /usr/local/bin/run_tests.sh

COPY entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh

RUN curl -sL https://deb.nodesource.com/setup_18.x | bash -
RUN apt-get install -y nodejs

RUN npm install -g yarn

WORKDIR /app

COPY submodules/bluefin-exchange-contracts-sui/ /app/submodules/bluefin-exchange-contracts-sui/

EXPOSE 9000 5003 8084 9184

# Set the entrypoint script or shell profile file as the default entrypoint
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]