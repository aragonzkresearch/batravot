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

