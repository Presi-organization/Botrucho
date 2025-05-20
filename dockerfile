FROM ubuntu:22.04

RUN apt-get update && apt-get install -y openssh-server sudo

# Crear usuario
RUN useradd -m -s /bin/bash devuser && echo "devuser ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Crear directorio SSH y dar permisos
RUN mkdir -p /home/devuser/.ssh && chmod 700 /home/devuser/.ssh

# Copiar clave pública (se copia luego al build)
COPY id_rsa.pub /home/devuser/.ssh/authorized_keys

RUN chmod 600 /home/devuser/.ssh/authorized_keys && \
    chown -R devuser:devuser /home/devuser/.ssh

# Configurar el servicio sshd
RUN mkdir /var/run/sshd

EXPOSE 22

CMD ["/usr/sbin/sshd", "-D"]
