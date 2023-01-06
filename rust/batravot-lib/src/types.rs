use std::str::FromStr;

/// Represents a single vote of a voter
///
/// # Examples
/// ```
/// use batravot_lib::Vote;
///
/// let vote = Vote::For;
/// ```
///
#[derive(Debug, PartialEq)]
pub enum Vote {
    For,
    Against,
}

impl FromStr for Vote {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "against" => Ok(Vote::Against),
            "-" => Ok(Vote::Against),
            "for" => Ok(Vote::For),
            "+" => Ok(Vote::For),
            _ => Err(format!("Invalid vote: {}", s)),
        }
    }
}