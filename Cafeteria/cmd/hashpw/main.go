package main

import (
	"bufio"
	"fmt"
	"os"

	"golang.org/x/crypto/bcrypt"
	"golang.org/x/term"
)

func main() {
	fmt.Print("Usuario (username): ")
	reader := bufio.NewReader(os.Stdin)
	username, _ := reader.ReadString('\n')

	fmt.Print("Contraseña: ")
	passwordBytes, err := term.ReadPassword(int(os.Stdin.Fd()))
	if err != nil {
		fmt.Fprintln(os.Stderr, "Error leyendo la contraseña:", err)
		os.Exit(1)
	}
	fmt.Println() // salto de línea porque ReadPassword no lo hace

	hash, err := bcrypt.GenerateFromPassword(passwordBytes, bcrypt.DefaultCost)
	if err != nil {
		fmt.Fprintln(os.Stderr, "Error generando el hash:", err)
		os.Exit(1)
	}

	fmt.Println("\n--- Copia esto en tu seed.sql ---")
	fmt.Printf("username: %s", username)
	fmt.Printf("password_hash: %s\n", string(hash))
}
