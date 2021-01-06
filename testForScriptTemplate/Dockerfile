FROM ubuntu:latest
WORKDIR /root/
COPY ./tmp_template ./
RUN chmod +x . && chmod +x tmp_template && useradd -m devaki
CMD [   "/root/tmp_template" ]