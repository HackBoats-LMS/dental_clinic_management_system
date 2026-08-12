


let clients: ReadableStreamDefaultController[] = [];

export function addClient(controller: ReadableStreamDefaultController) {
  clients.push(controller);
}

export function removeClient(controller: ReadableStreamDefaultController) {
  clients = clients.filter((c) => c !== controller);
}

export function broadcast(data: unknown) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  clients.forEach((controller) => {
    controller.enqueue(message);
  });
}